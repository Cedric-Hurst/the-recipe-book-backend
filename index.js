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
	// Read
	let countRes = 0;
	db.query('select count(*) as total from recipes', (err, results) => {
		if (err) throw err;
		countRes = results[0].total;
	});
	let indexes = [];
	db.query('select id from recipes', (err, results) => {
		if (err) throw err;
		results.map((i) => indexes.push(i.id));
	});
	const instructions = [];
	db.query('select * from instructions', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			instructions.push([]);
		}
		let x = 0;
		results.map((instrObj) => {
			if (instrObj.recipe_id === indexes[x]) {
				instructions[x].push(instrObj.instruction);
			} else {
				x++;
				instructions[x].push(instrObj.instruction);
			}
		});
	});
	const ingredients = [];
	db.query('select * from ingredients', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			ingredients.push([]);
		}
		let x = 0;
		results.map((ingreObj) => {
			if (ingreObj.recipe_id === indexes[x]) {
				ingredients[x].push({
					ingredient: ingreObj.ingredient,
					qty: ingreObj.qty,
					measure: ingreObj.measure,
					description: ingreObj.description,
				});
			} else {
				x++;
				ingredients[x].push({
					ingredient: ingreObj.ingredient,
					qty: ingreObj.qty,
					measure: ingreObj.measure,
					description: ingreObj.description,
				});
			}
		});
	});
	const categories = [];
	db.query('select * from fullCat', (err, results) => {
		if (err) throw err;
		for (let i = 0; i < countRes; i++) {
			categories.push([]);
		}
		let x = 0;
		results.map((catObj) => {
			if (catObj.recipe_id === indexes[x]) {
				categories[x].push(catObj.catName);
			} else {
				x++;
				categories[x].push(catObj.catName);
			}
		});
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
app.post('/recipes/new', (req, res) => {
	// Create
	const recipeValues = [
		req.body.recipeTitle,
		req.body.servings,
		req.body.img,
		req.body.timing.prepHr,
		req.body.timing.prepMin,
		req.body.timing.cookHr,
		req.body.timing.cookMin,
		1,
	];
	db.query(
		'INSERT INTO recipes (recipeTitle, servings, img, prepHr, prepMin, cookHr, cookMin, user_id) VALUES (?)',
		[recipeValues],
		(err, results) => {
			if (err) throw err;
			console.log('recipe Added');
		}
	);
	let id = 0;
	const categories = [];
	const ingredients = [];
	const instructions = [];
	db.query(
		'SELECT id from recipes WHERE recipeTitle = ?',
		req.body.recipeTitle,
		(err, results) => {
			if (err) throw err;
			id = results[0].id;
			req.body.category.map((cat) => {
				categories.push([cat, id]);
			});
			req.body.ingredients.map((ingre) => {
				ingredients.push([
					ingre.ingredient,
					ingre.qty,
					ingre.measure,
					ingre.description,
					id,
				]);
			});
			req.body.instructions.map((inst) => {
				instructions.push([inst, id]);
			});
			db.query(
				'INSERT INTO recipe_categories (cat_id, recipe_id) VALUES ?',
				[categories],
				(err, results) => {
					if (err) throw err;
				}
			);
			db.query(
				'INSERT INTO ingredients (ingredient, qty, measure, description, recipe_id) VALUES ?',
				[ingredients],
				(err, results) => {
					if (err) throw err;
				}
			);
			db.query(
				'INSERT INTO instructions (instruction, recipe_id) VALUES ?',
				[instructions],
				(err, results) => {
					if (err) throw err;
				}
			);
			return res.json(id);
		}
	);
});
app.delete('/recipes/:id', (req, res) => {
	// Delete
	const { id } = req.params;
	db.query(
		'DELETE FROM recipe_categories WHERE recipe_id = ?',
		id,
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query(
		'DELETE FROM ingredients WHERE recipe_id = ?',
		id,
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query(
		'DELETE FROM instructions WHERE recipe_id = ?',
		id,
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query('DELETE FROM recipes WHERE id = ?', [id], (err, results) => {
		if (err) throw err;
	});
});
app.put('/recipes/edit', (req, res) => {
	// Update
	const id = req.body.id;
	console.log(req.body);
	const q =
		'UPDATE recipes SET recipeTitle = ?, servings = ?, img = ?, prepHr = ?, prepMin = ?, cookHr = ?, cookMin = ?, last_updated = now() where id = ?';
	const recipeValues = [
		req.body.recipeTitle,
		req.body.servings,
		req.body.img,
		req.body.timing.prepHr,
		req.body.timing.prepMin,
		req.body.timing.cookHr,
		req.body.timing.cookMin,
	];
	db.query(q, [...recipeValues, id], (err, results) => {
		if (err) throw err;
	});

	// delete categories, ingredients and instructions
	db.query(
		'DELETE FROM recipe_categories WHERE recipe_id = ?',
		id,
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query(
		'DELETE FROM ingredients WHERE recipe_id = ?',
		id,
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query(
		'DELETE FROM instructions WHERE recipe_id = ?',
		id,
		(err, results) => {
			if (err) throw err;
		}
	);

	const categories = [];
	req.body.category.map((cat) => {
		categories.push([cat, id]);
	});
	const ingredients = [];
	req.body.ingredients.map((ingre) => {
		ingredients.push([
			ingre.ingredient,
			ingre.qty,
			ingre.measure,
			ingre.description,
			id,
		]);
	});
	const instructions = [];
	req.body.instructions.map((inst) => {
		instructions.push([inst, id]);
	});

	// add updated categories, ingredients and instructions
	db.query(
		'INSERT INTO recipe_categories (cat_id, recipe_id) VALUES ?',
		[categories],
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query(
		'INSERT INTO ingredients (ingredient, qty, measure, description, recipe_id) VALUES ?',
		[ingredients],
		(err, results) => {
			if (err) throw err;
		}
	);
	db.query(
		'INSERT INTO instructions (instruction, recipe_id) VALUES ?',
		[instructions],
		(err, results) => {
			if (err) throw err;
		}
	);
});

app.listen(3300, () => {
	console.log('Backend up and running');
});
