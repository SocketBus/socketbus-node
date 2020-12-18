import axios from 'axios';

import { createHash, randomBytes, createCipheriv } from "crypto";
import { AES, enc, lib } from "crypto-js";

import SocketBusOptions from './interfaces/SocketBusOptions';
import BroadcastResult from './interfaces/BroadcastResult';

const SOCKEBUS_DOMAIN = 'https://app.socketbus.com';

var CryptoJSAesJson = {
    'stringify': function (cipherParams: any) {
        var j:any = { ct: cipherParams.ciphertext.toString(enc.Base64) }
        if (cipherParams.iv) j.iv = cipherParams.iv.toString()
        if (cipherParams.salt) j.s = cipherParams.salt.toString()
        return JSON.stringify(j).replace(/\s/g, '')
    },
    'parse': function (jsonStr:any) {
        var j = JSON.parse(jsonStr)
        var cipherParams = lib.CipherParams.create({ ciphertext: enc.Base64.parse(j.ct) })
        if (j.iv) cipherParams.iv = enc.Hex.parse(j.iv);
        if (j.s) cipherParams.salt = enc.Hex.parse(j.s);
        return cipherParams
    }
}

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
        let json = JSON.stringify(data);

        let key = createHash('sha256').update(this.options.secret).digest('hex').substring(0, 32);
        let iv = createHash('sha256').update(this.options.app_id).digest('hex').substring(0, 16);
        console.log(key, iv);

        let cipher = createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(json, 'utf8', 'base64');
        encrypted += cipher.final('base64');


        let buff = Buffer.from(encrypted);

        return buff.toString('base64');
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

        data = AES.encrypt(JSON.stringify(data), password, {
            format: CryptoJSAesJson
        }).toString();

        return data;
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





    //===============================================//
    // Public Methods                                //
    //===============================================//

    /**
     * Generates the response needed for authenticate an user in a channel
     * 
     * @param socketId Socket Id of the user trying to authenticate, this information comes on the auth request
     * @param channelName The name of the channel that the user is trying to authenticate
     * @param result A boolean that informs if the user can(true) or can not(false) be authenticated to channel 
     */
    public auth(socketId: string, channelName: string, result: boolean = true) {
        if (!result) {
            return { status: 'noauth' };
        }

        return this.parseResult({
            auth: this.generateHash(socketId, channelName)
        }, channelName);
    }

    /**
     * Authenticates an user in a presence channel
     * 
     * @param socketId Socket Id of the user trying to authenticate, this information comes on the auth request
     * @param channelName The name of the channel that the user is trying to authenticate
     * @param userId Id of the current user
     * @param result Data to be sent to the users in the channel
     */
    public authPresence(socketId: string, channelName: string, userId: any, result: any) {
        if (!result) {
            return { status: 'noauth' };
        }

        let encryption = this.encrypt(this.encryptData(result, channelName));

        return this.parseResult({
            auth: this.generateHash(socketId, channelName),
            data: encryption,
            presence: true
        }, channelName);
    }

    /**
     * Broadcasts a payload to a channel
     * 
     * @param channels A string or array of strings with the names of the channel to be broadcasted
     * @param eventName The name of the event to be broadcasted
     * @param data The data to be sent to the clients
     */
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