import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Document, Schema } from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import ShortUniqueId from 'short-unique-id';

const app = express();
const PORT = process.env.PORT || 3001;
const uid = new ShortUniqueId();

mongoose.connect(process.env.URI || '', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).catch(err => console.error('Failed to connect to MongoDB:', err));

interface ISubmission extends Document {
    linkId: string;
    name: string;
    like: string;
    dislike: string;
    paragraph: string;
    anonymous: boolean;
}

const submissionSchema = new Schema<ISubmission>({
    linkId: String,
    name: String,
    like: String,
    dislike: String,
    paragraph: String,
    anonymous: Boolean
});

const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);

interface IUser extends Document {
    linkId: string;
    name: string;
    email: string;
    password: string;
}

const userSchema = new Schema<IUser>({
    linkId: String,
    name: String,
    email: String,
    password: String
});

const User = mongoose.model<IUser>('User', userSchema);

interface JwtPayload {
    id: string;
}

const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(400).json({ message: 'Token is needed' });
    }
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload;
        req.user = user;
        next();
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        } else {
            return res.status(401).json({ message: 'Invalid token' });
        }
    }
};

app.use(express.json());
app.use(cors());

app.post('/api/signup', async (req: Request, res: Response) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists", success: false });
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 8);
        const linkId = generateUniqueId();
        const user = new User({ linkId, password: hashedPassword, name: req.body.name, email: req.body.email });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || '');
        await user.save();
        res.status(200).json({ linkId, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post("/api/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist", success: false });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Email or password is wrong", success: false });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || '');
        return res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/submit-form/:linkId', async (req: Request, res: Response) => {
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

app.get("/api/profile", verifyToken, async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ _id: (req.user as JwtPayload).id });
        return res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/submissions', verifyToken, async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ _id: (req.user as JwtPayload).id });
        const linkId = user?.linkId;
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

function generateUniqueId(): string {
    return uid.rnd(10);
}