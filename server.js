require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors')
const app = express();
const PORT = process.env.PORT || 3001;
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
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
const userSchema = new mongoose.Schema({
    linkId: String,
    name: String,
    email: String,
    password: String


});

const User = mongoose.model('user', userSchema);
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(400).json({ message: 'token is needed' });
    }
    try {
        const user = await jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'invalid' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'exprired' });
        } else {
            return res.status(401).json({ message: 'invalid' });
        }
    }
};

app.use(express.json());
app.use(cors())

app.post('/api/signup', async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists", success: false });
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 8);
        const linkId = generateUniqueId();
        const user = new User({ linkId, password: hashedPassword, name: req.body.name, email: req.body.email });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        await user.save()
        res.status(200).json({ linkId, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post("/api/login", async (req, res) => {
    try {
        console.log(req.body)
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User Does not exists", success: false });
        }
        console.log(user)
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(isPasswordValid)

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Email or password is wrong", success: false });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        return res.status(200).json({ token });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
)


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
app.get("/api/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.user.id })
        return res.status(200).json({ user });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})


app.get('/api/submissions', verifyToken, async (req, res) => {
    try {
        console.log("here")
        let user = await User.findOne({ _id: req.user.id })
        const linkId = user.linkId;
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


