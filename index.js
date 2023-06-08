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

app.get('/recipes', (req, res) => {
	let countRes = 0;
	db.query('select count(*) as total from recipes', (err, results) => {
		if (err) throw err;
		countRes = results[0].total;
	});
	const instructions = [];
	db.query('select * from instructions', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			instructions.push([]);
		}
		results.map((instrObj) =>
			instructions[instrObj.recipe_id - 1].push(instrObj.instruction)
		);
	});
	const ingredients = [];
	db.query('select * from ingredients', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			ingredients.push([]);
		}
		results.map((ingreObj) =>
			ingredients[ingreObj.recipe_id - 1].push({
				ingredient: ingreObj.ingredient,
				qty: ingreObj.qty,
				measure: ingreObj.measure,
				description: ingreObj.description,
			})
		);
	});
	const categories = [];
	db.query('select * from fullCat', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			categories.push([]);
		}
		results.map((catObj) =>
			categories[catObj.recipe_id - 1].push(catObj.catName)
		);
	});
	const recipes = [];
	db.query('select * from recipes_users', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			recipes.push({
				recipeTitle: results[i].recipeTitle,
				id: results[i].id,
				favorite: false,
				servings: results[i].serving,
				img: results[i].img,
				category: [...categories[i]],
				timing: {
					prepHr: results[i].prepHr,
					prepMin: results[i].prepMin,
					cookHr: results[i].cookHr,
					cookMin: results[i].cookMin,
				},
				ingredients: [...ingredients[i]],
				instructions: [...instructions[i]],
				author: results[i].author,
			});
		}
		return res.json(recipes);
	});
});
app.get('/test', (req, res) => {
	db.query('select * from recipes', (err, results) => {
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
