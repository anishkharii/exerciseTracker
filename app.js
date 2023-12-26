const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use('/public',express.static('public'));
app.use(cors());
mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log('connected to MongoDB');
});



const exerciseSchema = new mongoose.Schema({
    
});
const userSchema = new mongoose.Schema({
    username:String,
    logs:[{description:String,
        duration:Number,
        date: String}]
});

const User = mongoose.model('User',userSchema);

app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/views/index.html');
});


app.post('/api/users',async(req,res)=>{
    const username = req.body.username;
    const newUser = new User({
        username:username
    });
    await newUser.save().then((data)=>{
        res.json({username:data.username,_id:data._id});
    })
});
app.get('/api/users',async(req,res)=>{
    const users = await User.find({});
    res.json(users);
});
app.get('/api/users/delete',async(req,res)=>{
    if(req.query.key==='AnishKhari'){
        await User.deleteMany({}).then(()=>{
            console.log('Deleted all data');
            res.redirect('/');
        });
    }
    else{
        res.json({error:"Not Authorised"});
    }
    
})

app.post('/api/users/:id/exercises',async(req,res)=>{
    const date = (req.body.date)? new Date(req.body.date).toDateString():new Date().toDateString()
    const newExercise = {
        description:req.body.description,
        duration:req.body.duration,
        date: date
    };
    try {
        await User.findByIdAndUpdate(req.params.id, { $push: { logs: newExercise } }, { new: true }).then((data) => {
            res.send({
                _id: data._id,
                username: data.username,
                date: newExercise.date,
                duration: newExercise.duration,
                description: newExercise.description
            });
        });
    }
    catch(err){
        res.json({error:"Invalid ID"});
    }
});

app.get('/api/users/:id/logs', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const logs = user.logs || [];

        const fromDate = new Date(req.query.from);
        const toDate = new Date(req.query.to);

        const filteredLogs = logs.filter(log => {
            const logDate = new Date(log.date);
            return (!req.query.from || logDate >= fromDate) &&
                   (!req.query.to || logDate <= toDate);
        });
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : filteredLogs.length;
        const limitedLogs = filteredLogs.slice(0, limit);

        const logData = limitedLogs.map(log => ({
            description: log.description,
            duration: log.duration,
            date: log.date
        }));

        const userData = {
            _id: user._id,
            username: user.username,
            count: limitedLogs.length,
            log: logData
        };

        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(3000,()=>{
    console.log("connected");
})