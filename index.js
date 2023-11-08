const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
// const secret =
//     "4d549bdc368d3751630cbcb610e353e3b323e57fa2769e25249b9de45df29c39855cae270fa2f18d485dd7bcdcb76b2403d4ef49d0c37889ba4a997d83299dee";

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:5173",
        //https://assignment-11-food-fair.web.app
        credentials: true,
    })
);

//DB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.csft7jl.mongodb.net/?retryWrites=true&w=majority`;

//connecting mongoDB
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const checker = (req, res, next) => {
    console.log(req.cookies);
    const { token } = req.cookies;
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
    }
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "You are not authorized" });
        }
        req.user = decoded;
        next();
    });
};

const run = async () => {
    try {
        //await client.connect();
        const foodsCollection = client.db("foodFairDB").collection("foods");
        const usersCollection = client.db("foodFairDB").collection("users");
        const categoryCollection = client.db("foodFairDB").collection("categories");
        const orderCollection = client.db("foodFairDB").collection("orders");

        //jwt
        app.post("/api/v1/auth/access_token", (req, res) => {
            res.setHeader(
                "Access-Control-Allow-Origin",
                "https://assignment-11-food-fair.web.app"
            );
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET, { expiresIn: 60 * 60 });
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            }).send({ success: true });
        });

        //custom middleware

        //getting user specific orders
        app.get("/api/v1/orders", checker, async (req, res) => {
            const email = req.query.email;

            const query = {};
            if (email) {
                query["buyerInfo.email"] = email;
            }

            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();

            res.send(result);
        });

        //logout
        app.post("/api/v1/auth/logout", async (req, res) => {
            const user = req.body;
            console.log("logging out user");

            console.log(user);
            res.clearCookie("token", { maxAge: 0 }).send({ success: true });
        });

        //updating food
        app.patch("/api/v1/food/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = { upsert: true };
            const updatedFood = req.body;
            console.log(updatedFood);

            const food = {
                $set: {
                    foodName: updatedFood.foodName,
                    image: updatedFood.image,
                    foodCategory: updatedFood.foodCategory,
                    price: updatedFood.price,
                    foodOrigin: updatedFood.foodOrigin,
                    shortDescription: updatedFood.shortDescription,
                    quantity: updatedFood.quantity,
                },
            };

            const result = await foodsCollection.updateOne(query, food, options);
            res.send(result);
        });

        //deleting order
        app.delete("/api/v1/delete_order/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        //sending newly added food to database
        app.post("/api/v1/foods", async (req, res) => {
            const newFood = req.body;
            console.log(newFood);

            const result = await foodsCollection.insertOne(newFood);
            res.send(result);
        });

        //sending orders to the db
        app.post("/api/v1/orders", async (req, res) => {
            const recentOrder = req.body;
            console.log(recentOrder);

            const result = await orderCollection.insertOne(recentOrder);
            res.send(result);
        });

        //getting all foods with all types of filter
        app.get("/api/v1/foods", checker, async (req, res) => {
            const category = req.query.category;
            const country = req.query.country;
            const email = req.query.email;

            const query = {};
            if (category) {
                query.foodCategory = category;
            }

            if (country) {
                query.foodOrigin = country;
            }

            if (email) {
                query["authorInfo.email"] = email;
            }

            // { $regex: country, $options: 'i' };

            //pagination
            const page = Number(req.query.page);
            const limit = Number(req.query.limit);
            const skip = (page - 1) * limit;

            const cursor = foodsCollection.find(query).skip(skip).limit(limit);
            const foods = await cursor.toArray();

            //count total
            const total = await foodsCollection.countDocuments();

            res.send({ total, foods });
        });

        //getting food category
        app.get("/api/v1/categories", async (req, res) => {
            const cursor = categoryCollection.find();
            const categories = await cursor.toArray();

            res.send(categories);
        });

        //getting single food
        app.get("/api/v1/food/:foodId", async (req, res) => {
            const foodId = req.params.foodId;
            const query = { _id: new ObjectId(foodId) };

            const food = await foodsCollection.findOne(query);
            res.send(food);
        });

        //getting most sold foods to show on homepage
        app.get("/api/v1/mostSoldFoods", async (req, res) => {
            const cursor = foodsCollection.find().sort({ timesSold: -1 });
            const foundFoods = await cursor.limit(6).toArray();

            res.send(foundFoods);
        });

        //updating sales and quantity
        app.post("/api/v1/foods/update_sales_quantity/:foodId", async (req, res) => {
            const foodId = req.params.foodId;
            const quantityString = req.query.quantity;
            const quantity = parseInt(quantityString);

            const updateValue = quantity >= 0 ? quantity : -quantity;
            const increment = quantity >= 0 ? 1 : -1;

            await foodsCollection.updateOne(
                { _id: new ObjectId(foodId) },
                { $inc: { timesSold: increment }, $inc: { quantity: -updateValue } }
            );

            const message =
                quantity >= 0
                    ? "Sales count updated successfully"
                    : "Quantity updated successfully";

            res.json({ message });
        });

        // sending users to the db
        app.post("/api/v1/users", async (req, res) => {
            const user = req.body;
            console.log(user);

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //getting user data
        app.get("/api/v1/users", async (req, res) => {
            const cursor = usersCollection.find();
            const result = await cursor.toArray();

            res.send(result);
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        //   await client.close();
    }
};
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Food Fair!");
});

app.listen(port, () => {
    console.log(`Food Fair is running on ${port}`);
});
