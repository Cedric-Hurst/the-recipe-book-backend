import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const db = mysql.createConnection({
	host: 'localhost',
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: 'recipe_book',
});

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
	res.send('working');
});

app.get('/test', (req, res) => {
	db.query('select * from categories', (err, results) => {
		if (err) throw err;
		return res.json(results);
	});
});

app.post('/test', (req, res) => {
	const q = 'insert into categories (catName) values (?)';
	const values = [];
	categories.map((cat) => {
		values.push([cat]);
	});

	db.query(q, values, (err, results) => {
		if (err) throw err;
		return res.json('success');
	});
});

app.listen(3300, () => {
	console.log('Backend up and running');
});
