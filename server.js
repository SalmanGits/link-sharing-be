require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors')
const app = express();
const PORT = process.env.PORT || 3001;
const ShortUniqueId = require('short-unique-id');
const uid = new ShortUniqueId();


mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true });

const submissionSchema = new mongoose.Schema({
    linkId: String,
    name: String,
    like: String,
    dislike: String,
    paragraph: String,
    anonymous: Boolean

});

const Submission = mongoose.model('Submission', submissionSchema);

app.use(express.json());
app.use(cors())

app.post('/api/create-link', async (req, res) => {
    try {
        const linkId = generateUniqueId();
        console.log(linkId)
        res.status(200).json({ linkId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/submit-form/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;
        const newSubmission = new Submission({ linkId, ...req.body });
        await newSubmission.save();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


app.get('/api/submissions/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;
        const submissions = await Submission.find({ linkId });
        res.status(200).json(submissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function generateUniqueId() {
    return uid.rnd(10)
}
