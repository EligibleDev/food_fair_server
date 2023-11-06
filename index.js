const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
        //     await client.connect();

        const foodsCollection = client.db("foodFairDB").collection("foods");
        foodsCollection.createIndex({ foodName: "text" });

        //   jwt
        app.post("/api/v1/auth/access_token", (req, res) => {});

        //   getting all foods
        app.get("/api/v1/foods", async (req, res) => {
            const cursor = foodsCollection.find();
            const foods = await cursor.toArray();

            res.send(foods);
        });

        //getting single food
        app.get("/api/v1/foods/:foodId", async (req, res) => {
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
        app.post("/api/v1/foods/increment-sales/:foodId", async (req, res) => {
            const foodId = req.params.foodId;
            await foodsCollection.updateOne(
                { _id: new ObjectId(foodId) },
                { $inc: { timesSold: 1 } }
            );

            res.json({ message: "Sales count updated successfully" });
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
