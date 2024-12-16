const express = require("express")
const app = express()
require("dotenv").config()
const cors = require("cors")
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require("cookie-parser")


const port = process.env.PORT || 5000

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://car-doctor-17c67.web.app",
        "https://car-doctor-17c67.firebaseapp.com"
    ],
    credentials: true
}

))
app.use(express.json())
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wukjrsy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token
    if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" })
    }

    jwt.verify(token, process.env.TOKEN_ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: err })
        }
        req.user = decoded
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const database = client.db("carDoctor")
        const servicesCollection = database.collection("services")
        const bookingCollection = database.collection("booking")


        //=================== auth related api ===========================

        app.post("/jwt", async (req, res) => {
            try {
                const userBody = req.body
                const token = jwt.sign({ email: userBody.email }, process.env.TOKEN_ACCESS_SECRET, { expiresIn: "1h" })

                // Set token in HTTP-only cookie
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none",
                })
                    .send({ success: "Token Created & save cookie" });
            } catch (error) {
                console.error("Error creating token or setting cookie:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        })

        //===================== middleware related api =======================
        



        app.post("/logout", async (req, res) => {
            const user = req?.body;
            console.log('logging out', user);
            res.clearCookie("token", { maxAge: 0 }).send({ success: true })
        })


        // ================ services related api =====================

        // find all services 
        app.get("/services", async (req, res) => {
            const cursor = servicesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // find single service by ID
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }


            const options = {
                projection: {
                    title: 1,
                    price: 1,
                    Image: 1
                }
            }

            const result = await servicesCollection.findOne(query, options)
            res.send(result)
        })


        // find all booking data by email
        app.get("/myBookings", verifyToken, async (req, res) => {
            const userEmail = req.query?.email;
            if (!userEmail || req.user?.email !== req.query?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            try {
                filter = { Email: userEmail }
                const result = await bookingCollection.find(filter).toArray()
                res.send(result)
            } catch (error) {
                console.error("Error fetching bookings:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        })


        app.post("/booking", async (req, res) => {
            const reqData = req.body;
            const result = await bookingCollection.insertOne(reqData)
            res.send(result)
        })


        app.patch("/update/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const reqBody = req.body;
            console.log(reqBody)



            const updateData = {
                $set: {
                    status: reqBody.status
                }
            }

            const result = await bookingCollection.updateOne(query, updateData)
            res.send(result)

        })


        app.delete("/booking/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.use("/", (req, res) => {
    res.send("Car Doctore Server start")
})


app.listen(port, () => {
    console.log(`Server running port is : ${port}`)
})