const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vu0s8qh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const jobCollection = client.db('jobPortal').collection('jobs');
        const jobApplicationCollection = client.db('jobPortal').collection('job_applications');


        app.get('/jobs', async (req, res) => {

            const email = req.query.email;
            let query = {};
            if (email) {
                query = { hr_email: email }
            }

            const cursor = jobCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobCollection.findOne(query);
            res.send(result);
        })

        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobCollection.insertOne(newJob);
            res.send(result);
        })

        // job application apis

        app.get('/job-application', async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email };
            const result = await jobApplicationCollection.find(query).toArray();

            //aggregation of data 
            for (const application of result) {
                console.log(application.job_id);
                const query1 = { _id: new ObjectId(application.job_id) };
                const job = await jobCollection.findOne(query1);
                if (job) {
                    application.title = job.title;
                    application.company = job.company;
                    application.company_logo = job.company_logo;
                    application.location = job.location;
                    application.jobType = job.jobType;
                }
            }

            res.send(result);
        })

        app.get('/job-application/jobs/:job_id', async (req, res) => {
            const jobId = req.params.job_id;
            const query = { job_id: jobId };
            const result = await jobApplicationCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            const result = await jobApplicationCollection.insertOne(application);

            //Not the best way (use Aggregate)

            const id = application.job_id;
            const query = { _id: new ObjectId(id) };
            const job = await jobCollection.findOne(query);
            let newCount = 0;

            if (job.applicationCount) {
                newCount = job.applicationCount + 1;
            } else {
                newCount = 1;
            }

            //update the job info.
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    applicationCount: newCount
                }
            }

            const updateResult = await jobCollection.updateOne(filter, updateDoc);

            res.send(result);
        })

        app.delete('/job-application/:id', async (req, res) => {
            const id = req.params.id;
            const email = req.query.email;
            const query = { _id: new ObjectId(id), applicant_email: email };
            const result = await jobApplicationCollection.deleteOne(query);
            res.send(result);
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Job Portal is ready to get the employee.');
})

app.listen(port, () => {
    console.log(`Job is waiting at : ${port}`);
})