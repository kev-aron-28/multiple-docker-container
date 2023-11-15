import { keys } from "./keys.js";
import express from 'express';
import cors from 'cors';
import redis from 'redis';
import pg from 'pg';

const app = express();
app.use(express.json());
app.use(cors());

const pgClient = new pg.Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort  
});

pgClient.on('error', () => console.log('LOST PG CONNECTION'));

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})

const redisPublisher = redisClient.duplicate();


app.get('/', (req, res) => {
  res.send('Hi');
})

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * FROM values');
  res.send(values.rows);
})

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values)
  })
})

app.post('/values', async (req, res) => {
  const index = req.body.index;
  if(parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'waiting');
  redisPublisher.publish('insert', index);

  pgClient.query('INSERT INTO values(number) values ($1)', [index]);
  res.send({ working: true })
})


app.listen(5000, (err) => {
  console.log("SERVER RUNNING");
})
