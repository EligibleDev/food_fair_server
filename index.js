const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const secret =
    "4d549bdc368d3751630cbcb610e353e3b323e57fa2769e25249b9de45df29c39855cae270fa2f18d485dd7bcdcb76b2403d4ef49d0c37889ba4a997d83299dee";

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

//DB URI
const uri =
    "mongodb+srv://mikailhossain0202:nVmuNWNGl28Sgzic@cluster0.csft7jl.mongodb.net/?retryWrites=true&w=majority";

//connecting mongoDB
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const run = async () => {
    try {
        //await client.connect();
        const foodsCollection = client.db("foodFairDB").collection("foods");
        const usersCollection = client.db("foodFairDB").collection("users");
        const categoryCollection = client.db("foodFairDB").collection("categories");
        const orderCollection = client.db("foodFairDB").collection("orders");

        //custom middleware
        const checker = (req, res, next) => {
            const { token } = req.cookies;
            if (!token) {
                return res.status(401).send({ message: "You are not authorized" });
            }

            jwt.verify(token, secret, function (err, decoded) {
                if (err) {
                    return res.status(401).send({ message: "You are not authorized" });
                }
                req.user = decoded;
                next();
            });
        };

        //jwt
        app.post("/api/v1/auth/access_token", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, secret, { expiresIn: 60 * 60 });
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            }).send({ success: true });
        });

        //sending orders to the db
        app.post("/api/v1/orders", async (req, res) => {
            const recentOrder = req.body;
            console.log(recentOrder);

            const result = await orderCollection.insertOne(recentOrder);
            res.send(result);
        });

        //getting all foods with all types of filter
        app.get("/api/v1/foods", async (req, res) => {
            const category = req.query.category;
            const country = req.query.country;

            const query = {};
            if (category) {
                query.foodCategory = category;
            }

            if (country) {
                query.foodOrigin = country;
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

        //increasing the timesSold value
        app.post("/api/v1/foods/increment_sales/:foodId", async (req, res) => {
            const foodId = req.params.foodId;
            await foodsCollection.updateOne(
                { _id: new ObjectId(foodId) },
                { $inc: { timesSold: 1 } }
            );

            res.json({ message: "Sales count updated successfully" });
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
            const cursor = users.find();
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
