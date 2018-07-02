import {Observable} from 'rxjs';
import {createConnection} from 'net';
import {parse} from 'url';

import * as WebSocket from 'ws';

export default class SocketClient {
  client : any;
  subscriptions : any;

  constructor(url, keepAlive, options) {
    const {host, path} = parse(url);

    this.subscriptions = {};

    this.client = new WebSocket(url, options);

    this.client.on('open', (response) => {
      console.log('connection open');

      if (keepAlive) {
        this.client.send(JSON.stringify(keepAlive));
        setInterval(() => {
          this.client.send(JSON.stringify(keepAlive));
        }, 60 * 1000);
      }
    });
  }

  publish(payload) {
    const stringified = JSON.stringify(payload);

    if (!this.client.isAlive) {
      this.client.on('open', () => {
        this.client.send(stringified);
      });
    } else {
      this.client.send(stringified);
    }
  }

  subscribe(eventName) {
    const source$ = Observable.create(observer => {
      this.client.on('message', response => {
        const data = JSON.parse(response);

        if (data['h'][0] === eventName) {
          observer.next(data['d']);
        }
      });
    });

    return source$;
  }
}


