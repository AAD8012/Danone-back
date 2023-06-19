const { graphql, buildSchema } = require("graphql");
const { GraphQLDateTime } = require("graphql-iso-date");
const mysql = require("mysql");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const port = process.env.PORT || 3000;

const connection = mysql.createConnection({
  host: "bbussi8jfrlbpzrbrbp2-mysql.services.clever-cloud.com",
  user: "uqyncva9a02bvtje",
  password: "t2pIOxh07ki1QRnMDy69",
  database: "bbussi8jfrlbpzrbrbp2",
});

connection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
  } else {
    console.log("Conexión exitosa a la base de datos");

    const schema = buildSchema(`
      scalar DateTime

      type User {
        id: Int
        name: String
        last_name: String
        password: String
        email: String
        daily_calories: Int
      }

      type Category {
        id: Int
        name: String
      }

      type Product {
        id: Int
        name: String
        category: Category
        description: String
        image_url: String
        price: Float
        energy_value: Int
        fats: Float
        carbohydrates: Float
        organic_farming: Int
        ingredients: String
        created: DateTime
        updated: DateTime
      }

      type Query {
        products: [Product]
        users: [User]
        findUser(email: String, password: String): User
        findUserById(id: Int!): User
      }

      type Mutation {
        createUser(name: String, last_name: String, password: String, email: String): User
        updateUserDailyCalories(id: Int!, daily_calories: Int!): User
      }
    `);

    const root = {
      products: (args, context) => {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id",
            (error, results) => {
              if (error) {
                reject(error);
              } else {
                const productsWithCategory = results.map((product) => {
                  return {
                    ...product,
                    category: {
                      id: product.category_id,
                      name: product.category_name,
                    },
                  };
                });
                resolve(productsWithCategory);
              }
            }
          );
        });
      },
      users: (args, context) => {
        return new Promise((resolve, reject) => {
          connection.query("SELECT * FROM users", (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
      },
      createUser: (args, context) => {
        const { name, last_name, password, email } = args;

        return new Promise((resolve, reject) => {
          const query =
            "INSERT INTO users (name, last_name, password, email) VALUES (?, ?, ?, ?)";
          const values = [name, last_name, password, email];

          connection.query(query, values, (error, result) => {
            if (error) {
              reject(error);
            } else {
              const createdUser = {
                id: result.insertId,
                name,
                last_name,
                password,
                email,
              };
              resolve(createdUser);
            }
          });
        });
      },
      findUser: (args, context) => {
        const { email, password } = args;

        return new Promise((resolve, reject) => {
          const query = "SELECT * FROM users WHERE email = ? AND password = ?";
          const values = [email, password];

          connection.query(query, values, (error, results) => {
            if (error) {
              reject(error);
            } else {
              const user = results[0] || null;
              resolve(user);
            }
          });
        });
      },
      findUserById: (args, context) => {
        const { id } = args;

        return new Promise((resolve, reject) => {
          const query = "SELECT * FROM users WHERE id = ?";
          const values = [id];

          connection.query(query, values, (error, results) => {
            if (error) {
              reject(error);
            } else {
              const user = results[0] || null;
              resolve(user);
            }
          });
        });
      },
      updateUserDailyCalories: (args, context) => {
        const { id, daily_calories } = args;

        return new Promise((resolve, reject) => {
          const query = "UPDATE users SET daily_calories = ? WHERE id = ?";
          const values = [daily_calories, id];

          connection.query(query, values, (error, result) => {
            if (error) {
              reject(error);
            } else {
              if (result.affectedRows === 1) {
                connection.query("SELECT * FROM users WHERE id = ?", [id], (error, results) => {
                  if (error) {
                    reject(error);
                  } else {
                    const user = results[0] || null;
                    resolve(user);
                  }
                });
              } else {
                resolve(null);
              }
            }
          });
        });
      },
    };

    app.use(express.json());
    app.use("/graphql", (req, res) => {
      const { query, variables } = req.body;

      graphql(schema, query, root, null, variables).then((response) => {
        res.json(response);
      });
    });

    app.listen(port, () => {
      console.log(`Servidor GraphQL corriendo en http://localhost:${port}/graphql`);
    });
  }
});