const SocketBus = require('../dist/main');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env')})

const { createHash } = require('crypto');

const  { APP_ID, APP_SECRET, CUSTOM_ENCRYPTION_KEY, CUSTOM_DOMAIN } = process.env;

const socketBus = new SocketBus({
    app_id: APP_ID,
    secret: APP_SECRET,
    custom_encryption_key: CUSTOM_ENCRYPTION_KEY,
    custom_domain: CUSTOM_DOMAIN
});

describe('SocketBus', function() {

    it('broadcast', ()=>{
        return socketBus.broadcast('private-app.20', 'App\\Events\\AppReadingReceivedEvent', {
            food: 'cupcake'
        }).then(data => {
            expect(data.length).toEqual(1)
        })
    });
    
    it('auth webhook', () => {
        const authorization1 = createHash('sha256').update(
            `webhook:${APP_ID}:${APP_SECRET}`
        ).digest('hex')
    
        const authorization2 = createHash('sha256').update(
            `webhook:${APP_ID}:${APP_SECRET.split('').reverse().join('')}`
        ).digest('hex')
    
        expect(socketBus.authWebhook(authorization1)).toBe(true);
        expect(socketBus.authWebhook(authorization2)).toBe(false);
    });

    it('Auth Normal', () => {
        const auth1 = socketBus.auth('socket-id', 'some-channel', true);
        
        expect(auth1.auth).toHaveLength(64);

        const auth2 = socketBus.auth('socket-id', 'some-channel', false);
        
        expect(auth2.status).toBe('noauth');
    });

    it('Auth presence', () => {
        const auth = socketBus.authPresence('socket-id', 'some-channel', 1, { user_id: 20 });
        expect(auth.data).toBeDefined();

        const auth2 = socketBus.authPresence('socket-id', 'some-channel', 1, false);
        expect(auth2.status).toBe('noauth');
    });
    
    it('Get API status', () => {
        return socketBus.getStatus()
            .then(result => {
                expect(result.users_count).toBeDefined();
            });
    });
    
    it('Get API Channels', () => {
        return socketBus.getChannels()
            .then(result => {
                expect(Array.isArray(result.rooms)).toBe(true);
            });
    });
    
    it('Get API Users Count in Channels', () => {
        return socketBus.getCountUsersInChannel('presence-teste')
            .then(result => {
                expect(result.users_count).toBeDefined();
            });
    });
    
    it('Get API Users', () => {
        return socketBus.getUsersInChannel('presence-teste')
            .then(result => {
                expect(Array.isArray(result.users)).toBe(true);
            });
    });
})