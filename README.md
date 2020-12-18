# SocketBus Node Library

#### Getting Started
1.  **Create an account** - 
1.  **Minimum requirements** -
1.  **Install the library** -
    ```bash
    npm install socketbus-node
    ```
1.  **Using the library** -

## Create a SocketBus instance

```js
import SocketBus from 'socketbus-node'

const config = { 
    app_id: 's-1-J2PCu8g8sAejZeXx',
    secret: 'cdKBpcruwYQ96kvIaYiorbTFxRDCbVfj'
}

const socketBus = new SocketBus(config);
```

### End-to-End Encryption
To ensure that your data is secure, you can enable End-to-end encryption under Application > Settings. This setting in combination with the option `custom_encryption_key` encrypts the payload and decrypts in the client when an authenticated user receives a encrypted payload.
```js
const config = { 
    app_id: 's-1-J2PCu8g8sAejZeXx',
    secret: 'cdKBpcruwYQ96kvIaYiorbTFxRDCbVfj',
    custom_encryption_key: 'my-unique-key'
}
```

## Authentication
```js
const socketId = req.body.socket_id;
const channelName = req.body.channel_name;

if (/** verifies if user can access the request channel */) {
    // returns the token to the client
    return socketbus.auth(socketId, channelName, true);
}

```

### Presence Authentication

```js
const socketId = req.body.socket_id;
const channelName = req.body.channel_name;
const userId = /** gets the current user id */;

if (/** verifies if user can access the request channel */) {
    // returns the auth data
    return socketbus.authPresence(socketId, channelName, userId, {
        userId: /** gets the current user id */,
        name: /** gets the current user name */
    });
}
```

## Broadcasting

```js
const payload = {
    food: 'cupcake'
}

/** Optional */
const broadcastOptions = {
    // Id or Ids of users that should not receive the event
    ignoreUsers: ['id1', 'id2']
}

socketBus.broadcast('food-observer','new-food', payload, broadcastOptions)
    .then(response => /** Event Sent */);
```

## Resources
[API Docs](https://socketbus.com/docs) - Check-out the full documentation

## Related Projects
[SocketBus JavaScript Client Library](https://github.com/SocketBus/socketbus-js) - JavaScript Client Library