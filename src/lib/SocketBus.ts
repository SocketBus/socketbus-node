import axios from 'axios';

import { createHash, randomBytes, createCipheriv } from "crypto";

import SocketBusOptions from './interfaces/SocketBusOptions';
import BroadcastResult from './interfaces/BroadcastResult';

const SOCKEBUS_DOMAIN = 'https://app.socketbus.com';
const SALT_LENGTH = 8;

export default class SocketBus {

    public options: SocketBusOptions;

    protected http;

    constructor(options: SocketBusOptions) {
        this.options = options;

        this.http = axios.create({
            baseURL: this.options.custom_domain ?? SOCKEBUS_DOMAIN,
            headers: {
                'Authorization': this.getAuthorization()
            }
        })
    }

    //===============================================//
    // Private Methods                               //
    //===============================================//

    private getAuthorization(): string {
        return `${this.options.app_id}:` + createHash('sha256').update(
            `${this.options.app_id}:${this.options.secret}`
        ).digest('hex');
    }

    private parseResult(response: any, channelName: string): any {
        let merge:any = {};

        if (this.options.custom_encryption_key) {
            merge['e2e'] = this.generatedE2EPassword(channelName);
        }

        return {
            ...response,
            ...merge
        }
    }

    /**
     * Encrypts the data for end-to-end encryption
     * 
     * @param data data to be encrypted
     */
    private encrypt(data: any) {

    }

    /**
     * Generates a hash for channel authentication
     * 
     * @param socketId 
     * @param channelName 
     */
    private generateHash(socketId: string, channelName: string): string {
        return createHash('sha256').update(
            `${this.options.app_id}:${this.options.secret}:${socketId}:${channelName}`
        ).digest('hex');
    }
    
    /**
     * 
     * @param channelName 
     */
    private generatedE2EPassword(channelName: string): string {
        return createHash('sha256').update(
            `${this.options.custom_encryption_key}:${channelName}`
        ).digest('hex').substring(0, 32);
    }

    private encryptData(data: any, channelName: string): any {
        if (!this.options.custom_encryption_key) {
            return data;
        }

        let password = this.generatedE2EPassword(channelName);

        let salt = randomBytes(SALT_LENGTH);

        let salted = '';
        let dx = '';

        while(salted.length < 48) {
            dx = createHash('md5').update(`${dx}.${password}.${salt}`).digest('hex');
            salted += dx;
        }

        let key = salted.substring(0, 32);
        let iv = salted.substring(32, 16);

        let cipher = createCipheriv('aes-256-cbc', key, iv);
        let encrypted_data = cipher.update(JSON.stringify(data), 'utf8', 'base64');

        encrypted_data += cipher.final('base64')

        let return_data = {
            ct: encrypted_data,
            iv: Buffer.from(iv, 'ascii').toString('hex'),
            s: salt.toString('hex')
        }


        return JSON.stringify(return_data);
    }





    //===============================================//
    // Public Methods                                //
    //===============================================//

    /**
     * 
     * @param socketId 
     * @param channelName 
     * @param result 
     */
    public auth(socketId: string, channelName: string, result: boolean = true) {
        return this.parseResult({
            auth: this.generateHash(socketId, channelName)
        }, channelName);
    }

    public authPresence(socketId: string, channelName: string, userId: any, result: boolean = true) {
        
    }

    public broadcast(channels: Array<string>|string, eventName: string, data: any): Promise<Array<BroadcastResult>> {

        return new Promise((resolve: CallableFunction, reject: CallableFunction) => {
            if (!Array.isArray(channels)) {
                channels = [channels];
            }

            let res: Array<BroadcastResult> = []

            function tryResolve(response: boolean, channel: string) {

                const addingRes: BroadcastResult =  {
                    channel: channel,
                    result: response
                };

                res.push(addingRes);

                if (channels.length <= res.length) {
                    resolve(res);
                }
            }
    
            for (const key in channels) {
                if (Object.prototype.hasOwnProperty.call(channels, key)) {
                    const channel = channels[key];
                    this.http.post(`/api/channels/${channel}/broadcast`, {
                        'event': eventName,
                        'data': this.encryptData(data, channel)
                    }).then(
                        (response: any) => {
                            tryResolve(true, channel);
                        },
                        (err: any) => {
                            tryResolve(false, channel);
                        }
                    )
                }
            }
        });
    }

    private async get(url: string) {
        try {
            let response = await this.http.get(url);
            return response.data;
        } catch(e) {
            if (e.response) {
                throw new Error("SocketBus Error " + JSON.stringify(e.response.data));
            } else {
                throw new Error(e);
            }
        }
    }

    /**
     * Gets the api status
     * - Total of users online
     */
    public async getStatus() {
        return await this.get('/api/status');
    }

    /**
     * Get all channels in use
     */
    public async getChannels() {
        return await this.get('/api/channels');
    }

    /**
     * Gets the count of users connected to a channel
     * 
     * @param channelName name of a channel
     */
    public async getCountUsersInChannel(channelName: string) {
        return await this.get(`/api/channels/${channelName}`);
    }

    /**
     * Gets all the users in a Channel
     * 
     * @param channelName name of a channel
     */
    public async getUsersInChannel(channelName: string) {
        return await this.get(`/api/channels/${channelName}/users`);
    }

    /**
     * Checks if an incoming webhook is valid
     * 
     * @param authorization token received on the header 'Authorization'
     * @returns boolean
     */
    public authWebhook(authorization: string): boolean {
        return createHash('sha256').update(
            `webhook:${this.options.app_id}:${this.options.secret}`
        ).digest('hex') === authorization;
    }
}