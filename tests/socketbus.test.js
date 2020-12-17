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
            fuck: true
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
    })
})