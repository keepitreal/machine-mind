import {fetchUrl} from 'fetch';
import {from} from 'rxjs';
import {map} from 'rxjs/operators';

export function fetchPromise(location : string, options?) : Promise<string> {
  return new Promise((resolve, reject) => {
    fetchUrl(location, options, (err: any, meta: any, body: any) => {
      if (err) {
        console.log('Error: ', err);
        reject(err);
      } else {
        resolve(body);
      }
    })
  })
}

export function fromPromise(location : string, options? : any) {
  console.log(location)
  return from(fetchPromise(location, options))
    .pipe(map(response => JSON.parse(response)));
}

