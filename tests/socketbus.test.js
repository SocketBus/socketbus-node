const SocketBus = require('../dist/main');

const { createHash } = require('crypto');

const app_id = 's-1-J2PCu8g8sAejZeXx';
const secret = 'cdKBpcruwYQ96kvIaYiorbTFxRDCbVfj';

const socketBus = new SocketBus({
    app_id: app_id,
    secret: secret,
    custom_encryption_key: 'My-test',
    custom_domain: 'http://localhost:3001'
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
            `webhook:${app_id}:${secret}`
        ).digest('hex')
    
        const authorization2 = createHash('sha256').update(
            `webhook:${app_id}:${secret.split('').reverse().join('')}`
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