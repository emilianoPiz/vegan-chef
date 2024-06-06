const express = require('express');
const path = require('path');
const fs = require('fs');
const server = express();
const router = express.Router();

//DB
const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');

//COSTUM

//PRENOTATORE
const AppointmentPicker = require('appointment-picker');
let pass = process.env.MONGO_PASS;

// MongoDB connection string  DB STARTS
const uri = `mongodb+srv://emilianopizzuti95:${pass}@chefsitedb.tcsakoi.mongodb.net/?retryWrites=true&w=majority&appName=chefSiteDB`;
 mongoose.connect(uri)
  .then(() => console.log('Connected successfully to MongoDB using Mongoose'))
  .catch(console.error);


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
      await client.db("chefSiteDB").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  run().catch(console.dir);

// Reservation Schema
const reservationSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  time: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, validate: {
      validator: function(v) { return /\d{10}/.test(v); },
      message: props => `${props.value} is not a valid phone number!`
  }}
});

// Review Schema
const reviewSchema = new mongoose.Schema({
  chefName: { type: String },  // Name of the chef or subject of the review
  reviewer: { type: String, required: true },  // Name of the person who wrote the review
  rating: { type: Number, required: true, min: 1, max: 5 },  // Rating given by the reviewer
  comments: { type: String, required: true },  // Comments provided by the reviewer
  date: { type: Date, default: Date.now }  // The date when the review was submitted
});

// Check if models already exist and use them if they do
const Reservation = mongoose.models['reservations'] ? mongoose.models['reservations'] : mongoose.model('reservations', reservationSchema);
const Review = mongoose.models['Review'] ? mongoose.models['Review'] : mongoose.model('Review', reviewSchema);



//DB ENDS//

//cards automation logic
const Ricetta = require('./public/ricettaCard');
const Evento = require('./public/eventoCard'); 
const imageBasePath = '/recipes_photos'
const imageDirectory = path.join(__dirname, 'img', 'recipes_photos');
const allFiles = fs.readdirSync(imageDirectory);


const imageFiles = allFiles.filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return ['.jpeg', '.jpg', '.png', '.gif'].includes(ext);
}); 

const relativeImagePaths = imageFiles.map((file) => path.join('/', imageBasePath, file)); // Relative path starting from root of the project
//recipes logic
const recipes = relativeImagePaths.map((imagePath, index) => {
  return new Ricetta('', 'A sample description', imagePath);
});
recipes.forEach((recipe, index) => {
  const imageName = path.basename(imageFiles[index], path.extname(imageFiles[index])); // Get the base name without extension
  recipe.name = imageName; // Assign the image name to the `Ricetta` instance
});
//events logic
const eventi = [
  new Evento(
    'India Retreat', 
    'Yoga e Cucina Ayurvedica: Pratica di yoga e corso di cucina ayurvedica per bilanciare i dosha e migliorare il benessere attraverso piatti equilibrati.', 
    '/path/to/image1.jpg', 
    '2024-05-15',
    ),
  new Evento(
    'Portugal Retreat', 
    'Yoga e Cucina Ayurvedica: Pratica di yoga e corso di cucina ayurvedica per bilanciare i dosha e migliorare il benessere attraverso piatti equilibrati.', 
    './img/utilities/propic.jpeg', 
    '2024-06-20',
    ),
  new Evento(
    'Ibiza Retreat', 
    'Yoga e Cucina Ayurvedica: Pratica di yoga e corso di cucina ayurvedica per bilanciare i dosha e migliorare il benessere attraverso piatti equilibrati.', 
    '/path/to/image3.jpg', 
    '2024-07-10',
    )
];


// Middleware for parsing POST requests
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Setup view engine and static files
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));
server.use(express.static(path.join(__dirname, 'img')));

// Routing
server.get('/',async (req, res) => {
  try {
      const reviews = await Review.find();  // Fetch all reviews
      res.render('index', { reviews });   // Pass reviews to EJS template
      return reviews
  } catch (error) {
      res.status(500).send(error);
  }
});
server.get('/about', async (req, res) => {
    try {
        const reviews = await Review.find(); // Fetch all reviews
        res.render('about', { reviews }); // Make sure this matches your EJS template filename
    } catch (error) {
        res.status(500).send(error);
    }
});

server.get('/reserve', (req, res) => {
    res.render('reserve');
});

server.get('/recipes', (req, res) => {
  res.render('recipes', { recipes });
});

server.get('/success', (req, res) => {
  res.render('success',);
});
server.get('/failure', (req, res) => {
  res.render('failure',);
});
server.get('/review', (req, res) => {
  res.render('review',);
});


server.get('/personal', async (req, res) => {
    try {
        const reservations = await Reservation.find();
        console.log(reservations); // This will log the output to your console
        reservations.sort(function(a, b) {
          return new Date(a.date) - new Date(b.date);
        });
        res.render('reservations', { reservations });
    } catch (error) {
        res.status(500).send("Error retrieving reservations: " + error.message);
    }
});
//get events pages
server.get('/events', (req, res) => {
  res.render('events',{ eventi: eventi });
});
//Endpoint to handle reservations
server.post('/book-appointment', async (req, res) => {
  try {
    const newReservation = new Reservation(req.body);
    await newReservation.save();
    console.log(`New reservation created: ${newReservation}`);
    res.redirect('/success');
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).redirect('/failure')
  }
});
server.post('/submit-review', async (req, res) => {
    try {
        const { name, rating, comments } = req.body;
        const newReview = new Review({
            reviewer: name,
            rating: rating,
            comments: comments,
            date: new Date(),
            chefName: 'Doina'
        });
        await newReview.save();
        res.redirect('/about'); // Redirect to the reviews page or wherever appropriate
    } catch (error) {
        res.status(500).send("Error submitting review: " + error.message);
    }
});
 router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find();  // Fetch all reviews
        res.render('reviews', { reviews });   // Pass reviews to EJS template
        return reviews
    } catch (error) {
        res.status(500).send(error);
    }
});
// 404 Error handling
server.use((req, res) => {
    res.status(404).render('404');
});

// Start the server
server.listen(3000, () => {
    console.log('Server listening on port 3000');
});


