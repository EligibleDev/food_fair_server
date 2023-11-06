const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

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
        //   await client.connect();
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
