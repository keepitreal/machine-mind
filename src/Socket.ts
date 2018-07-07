import {Observable} from 'rxjs';
import {createConnection} from 'net';
import {parse} from 'url';

import * as WebSocket from 'ws';

export default class SocketClient {
  client : WebSocket;

  constructor(url, keepAlive = {}, options = {}) {
    const {host, path} = parse(url);

    this.client = new WebSocket(url, options);

    this.client.on('open', (response) => {
      console.log('Connected to', url);
    });

    const source$ = Observable.create(observer => {
      this.client.on('message', response => {
        const data = JSON.parse(response);
        observer.next(data);
      });
    });

    return source$;
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

  subscribe(eventName?: string) {
    const source$ = Observable.create(observer => {
      this.client.on('message', response => {
        console.log(response)
        const data = JSON.parse(response);
        observer.next(data);
      });
    });

    return source$;
  }
}


