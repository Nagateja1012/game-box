const fs = require('fs');
const path = require('path');

const CATEGORIES = {
    PLACES: [
        'School', 'Hospital', 'Library', 'Gym', 'Park', 'Mall', 'Airport', 'Station', 'Office', 'Restaurant',
        'Hotel', 'Beach', 'Museum', 'Theater', 'Zoo', 'Stadium', 'Church', 'Temple', 'College', 'Factory',
        'Laboratory', 'Pharmacy', 'Bank', 'Post Office', 'Bakery', 'Cafe', 'Bar', 'Casino', 'Circus', 'Farm',
        'Garage', 'Garden', 'Harbor', 'Prison', 'University'
    ],
    COUNTRIES: [
        'India', 'America', 'China', 'Japan', 'Russia', 'Germany', 'France', 'UK', 'Italy', 'Canada',
        'Brazil', 'Australia', 'Mexico', 'Spain', 'Egypt', 'Turkey', 'Argentina', 'South Korea', 'Indonesia', 'Saudi Arabia',
        'South Africa', 'Nigeria', 'Thailand', 'Vietnam', 'Sweden', 'Norway', 'Switzerland', 'Netherlands', 'Poland', 'Iran',
        'Pakistan', 'Bangladesh', 'Philippines', 'Colombia', 'Ukraine'
    ],
    FOOD: [
        'Pizza', 'Burger', 'Pasta', 'Sushi', 'Taco', 'Sandwich', 'Salad', 'Steak', 'Soup', 'Curry',
        'Rice', 'Bread', 'Cheese', 'Cake', 'Ice Cream', 'Chocolate', 'Apple', 'Orange', 'Banana', 'Mango',
        'Grape', 'Strawberry', 'Potato', 'Tomato', 'Onion', 'Chicken', 'Fish', 'Egg', 'Milk', 'Coffee',
        'Tea', 'Juice', 'Cookie', 'Donut', 'Popcorn'
    ],
    THINGS: [
        'Car', 'Bike', 'Bus', 'Train', 'Plane', 'Boat', 'Chair', 'Table', 'Bed', 'Sofa',
        'Lamp', 'Fan', 'Phone', 'Laptop', 'Watch', 'Camera', 'Pen', 'Pencil', 'Book', 'Bag',
        'Shoe', 'Shirt', 'Pant', 'Hat', 'Glass', 'Cup', 'Plate', 'Spoon', 'Fork', 'Knife',
        'Key', 'Lock', 'Door', 'Window', 'Mirror'
    ],
    ANIMALS: [
        'Lion', 'Tiger', 'Bear', 'Wolf', 'Dog', 'Cat', 'Elephant', 'Horse', 'Cow', 'Sheep',
        'Goat', 'Pig', 'Monkey', 'Rabbit', 'Deer', 'Fox', 'Zebra', 'Giraffe', 'Hippo', 'Rhino',
        'Kangaroo', 'Panda', 'Eagle', 'Parrot', 'Pigeon', 'Duck', 'Chicken', 'Penguin', 'Snake', 'Lizard',
        'Frog', 'Turtle', 'Fish', 'Shark', 'Whale'
    ],
    MOVIES: [
        'Harry Potter', 'Star Wars', 'Avengers', 'Batman', 'Superman', 'Spiderman', 'Matrix', 'Titanic', 'Avatar', 'Frozen',
        'Lion King', 'Shrek', 'Toy Story', 'Finding Nemo', 'Inception', 'Interstellar', 'Joker', 'Godfather', 'Rocky', 'James Bond',
        'Lord of the Rings', 'Hobbit', 'Pirate of Caribbean', 'Fast Furious', 'Jurassic Park', 'Terminator', 'Alien', 'Predator', 'X-Men', 'Iron Man',
        'Thor', 'Hulk', 'Captain America', 'Black Panther', 'Wonder Woman'
    ],
    BRANDS: [
        'Apple', 'Google', 'Microsoft', 'Amazon', 'Facebook', 'Tesla', 'Samsung', 'Sony', 'Disney', 'Netflix'
    ],
    BRANDS2: [
        'Starbucks', 'Dunkin', 'McDonald', 'KFC', 'Burger King', 'Subway', 'Pizza Hut', 'Domino',
    ],
    BRANDS3: [
        'Ford', 'Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi'
    ],
    BRANDS4: [
        'Coke', 'Pepsi', 'Monster', 'Red Bull', 'Fanta', 'Sprite', 'Diet Coke', 'Prime',
    ],

    BRANDS5: [
        'Nike', 'Adidas', 'Puma', 'Reebok', 'Gucci', 'Prada', 'Chanel', 'Louis Vuitton', 'Rolex',
    ],

    PROFESSIONS: [
        'Teacher', 'Student', 'Doctor', 'Nurse', 'Engineer', 'Lawyer', 'Police', 'Soldier', 'Pilot', 'Driver',
        'Chef', 'Waiter', 'Actor', 'Singer', 'Dancer', 'Artist', 'Writer', 'Farmer', 'Fisherman', 'Carpenter',
        'Plumber', 'Electrician', 'Mechanic', 'Barber', 'Tailor', 'Firefighter', 'Scientist', 'Astronaut', 'Judge', 'King',
        'Queen', 'President', 'Manager', 'Secretary', 'Guard'
    ],
    EMOTIONS: [
        'Happy', 'Sad', 'Angry', 'Scared', 'Excited', 'Bored', 'Tired', 'Hungry', 'Thirsty', 'Sleepy',
        'Sick', 'Healthy', 'Rich', 'Poor', 'Strong', 'Weak', 'Fast', 'Slow', 'Hot', 'Cold',
        'Wet', 'Dry', 'Clean', 'Dirty', 'Good', 'Bad', 'Love', 'Hate', 'Funny', 'Serious',
        'Smart', 'Stupid', 'Crazy', 'Calm', 'Nervous'
    ]
};

const OUTPUT_FILE = path.join(__dirname, '../server/games/undercover/words.js');

function generatePairs() {
    let pairs = [];
    let id = 1;

    Object.entries(CATEGORIES).forEach(([category, items]) => {
        // Generate permutations: each item against every other item in the same category
        // We use loops to generate (A, B) and (B, A) as they are distinct game scenarios
        for (let i = 0; i < items.length; i++) {
            for (let j = 0; j < items.length; j++) {
                if (i === j) continue;

                pairs.push({
                    id: id++,
                    category: category,
                    civilian: items[i],
                    undercover: items[j]
                });
            }
        }
    });

    return pairs;
}

const allPairs = generatePairs();

const fileContent = `const WORD_PAIRS = ${JSON.stringify(allPairs, null, 4)};\n\nmodule.exports = { WORD_PAIRS };\n`;

try {
    fs.writeFileSync(OUTPUT_FILE, fileContent);
    console.log(`Successfully generated ${allPairs.length} word pairs.`);
    console.log(`File written to: ${OUTPUT_FILE}`);
} catch (error) {
    console.error('Error writing file:', error);
}
