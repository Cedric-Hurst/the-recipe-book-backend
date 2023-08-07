import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';
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

// Recipes
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
	db.query('select * from instructions order by recipe_id', (err, results) => {
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
	db.query('select * from ingredients order by recipe_id', (err, results) => {
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
		req.body.user_id,
	];
	db.query(
		'INSERT INTO recipes (recipeTitle, servings, img, prepHr, prepMin, cookHr, cookMin, user_id) VALUES (?)',
		[recipeValues],
		(err, results) => {
			if (err) throw err;
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

app.get('bookmark', (req, res) => {});
// add Bookmark (favorites)
app.post('/bookmark', (req, res) => {
	db.query(
		`INSERT INTO favorites (recipe_id, user_id) VALUES (${req.body.recipeId}, ${req.body.userId})`,
		(err, result) => {
			if (err) throw err;
		}
	);
});
//remove bookmark
app.put('/bookmark', (req, res) => {
	db.query(
		`DELETE FROM favorites where recipe_id = ${req.body.recipeId} and user_id = ${req.body.userId}`,
		(err, result) => {
			if (err) throw err;
		}
	);
});

// Accounts
app.get('/accounts', (req, res) => {
	db.query('SELECT username, id, email FROM users', (err, results) => {
		if (err) throw err;
		res.json(results);
	});
});
app.post('/accounts/new', (req, res) => {
	const saltRounds = parseInt(process.env.DB_SALT);
	db.query('SELECT username, email FROM users', (err, results) => {
		if (err) throw err;
		let addAccount = true;
		results.map((user) => {
			// redundant check
			if (user.username.toLowerCase() === req.body.username.toLowerCase()) {
				addAccount = false;
			} else if (user.email.toLowerCase() === req.body.email.toLowerCase()) {
				addAccount = false;
			}
		});

		bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
			const values = [req.body.username, req.body.email, hash];
			addAccount &&
				db.query(
					'INSERT INTO users (username, email, password) VALUES (?)',
					[values],
					(err, results) => {
						if (err) throw err;
						db.query(
							'SELECT id FROM users WHERE username = ?',
							[req.body.username],
							(err, results) => {
								return res.json(results[0].id);
							}
						);
					}
				);
		});
	});
});
app.delete('/accounts/:id', (req, res) => {
	const { id } = req.params;
	db.query('DELETE FROM users WHERE id = ?', [id], (err, results) => {
		if (err) throw err;
	});
});
app.put('/accounts/:id', (req, res) => {
	const saltRounds = parseInt(process.env.DB_SALT);
	const { id } = req.params;
	bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
		db.query(
			'UPDATE users SET email = ?, password = ? WHERE id = ?',
			[req.body.email, hash, id],
			(err, results) => {
				if (err) throw err;
			}
		);
	});
});

// LOGIN ... post request so i can send req.body using axios in client side
app.post('/login', (req, res) => {
	db.query('SELECT username FROM users', (err, results) => {
		if (
			results.filter(
				(user) =>
					user.username.toLowerCase() === req.body.username.toLowerCase()
			).length > 0 // check if Username exists
		) {
			db.query(
				'SELECT * FROM users WHERE username = ?',
				[req.body.username],
				(err, result) => {
					if (err) throw err;
					bcrypt.compare(
						req.body.password, // incoming password
						result[0].password, // database hashed password
						function (error, bcryptResult) {
							if (error) throw error;
							const favs = [];
							// grab user favorite recipes
							db.query(
								'SELECT recipe_id FROM favorites WHERE user_id = ?',
								[result[0].id],
								(err, bookmarkRes) => {
									for (let i = 0; i < bookmarkRes.length; i++) {
										favs.push(bookmarkRes[i].recipe_id);
									}
									const user = {
										username: result[0].username,
										id: result[0].id,
										email: result[0].email,
										bookmarks: favs,
									};
									// return to the client the result of the bcrypt compare
									bcryptResult ? res.json(user) : res.json(false);
								}
							);
						}
					);
				}
			);
		} else {
			res.json(false);
		}
	});
});
// check username and email
app.post('/checkuser', (req, res) => {
	db.query('SELECT username, email FROM users', (err, results) => {
		if (err) throw err;
		if (req.body) {
			results.map((user) => {
				if (
					req.body.username &&
					user.username.toLowerCase() === req.body.username.toLowerCase()
				) {
					return res.send('Username is already in use');
				} else if (req.body.email && user.email === req.body.email)
					return res.send('Email already attached to an account');
			});
		}
	});
});
// Searchbar
app.get('/search', (req, res) => {
	const { q } = req.query;
	db.query(
		`SELECT recipeTitle, id from recipes where recipeTitle LIKE '%${q}%'`,
		(err, results) => {
			if (err) throw err;
			return res.send(results);
		}
	);
});
// encrypt / decrypt cookie value
app.get('/encrypt', (req, res) => {
	const { q } = req.query;
	return res.json(
		CryptoJS.AES.encrypt(q, process.env.RB_COOKIE_KEY).toString()
	);
});
app.get('/decrypt', (req, res) => {
	const { q } = req.query;
	return res.json(
		CryptoJS.AES.decrypt(q, process.env.RB_COOKIE_KEY).toString(
			CryptoJS.enc.Utf8
		)
	);
});

app.listen(process.env.PORT, () => {
	console.log('Backend up and running');
});
