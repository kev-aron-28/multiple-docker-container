import redis from 'redis';
import { keys } from './keys.js'

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})

const sub = redisClient.duplicate();

function fib(index){
  if(index < 1) return 1;
  return fib(index - 1) + fib(index - 2);
}

sub.on('message', (channel, message) => {
  console.log(message, 'INSERT');
  redisClient.hset('values', message, fib(parseInt(message)))
})

sub.subscribe('insert')

console.log("LISTENING WORKER")
