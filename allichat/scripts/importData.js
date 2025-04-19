const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your service account key file
// You'll need to download this from Firebase Console > Project Settings > Service Accounts > Generate New Private Key
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

// Check if service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: serviceAccountKey.json not found!');
  console.error('Please download your service account key from Firebase Console and save it as serviceAccountKey.json in the project root.');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Read the JSON data
const dataPath = path.join(__dirname, '../firestore.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Function to import data recursively
async function importData(data, path = '') {
  for (const [key, value] of Object.entries(data)) {
    const currentPath = path ? `${path}/${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // If it's an object with nested properties, create a document
      const docRef = db.collection(path).doc(key);
      
      // Filter out nested objects that should be collections
      const docData = {};
      for (const [propKey, propValue] of Object.entries(value)) {
        if (propValue && typeof propValue === 'object' && !Array.isArray(propValue)) {
          // This is a nested collection, skip for now
          continue;
        }
        docData[propKey] = propValue;
      }
      
      // Set the document data
      await docRef.set(docData);
      console.log(`Created document: ${currentPath}`);
      
      // Process nested collections
      for (const [propKey, propValue] of Object.entries(value)) {
        if (propValue && typeof propValue === 'object' && !Array.isArray(propValue)) {
          // This is a nested collection, process it
          await importData({ [propKey]: propValue }, currentPath);
        }
      }
    } else {
      // If it's a primitive value or array, set it directly
      const docRef = db.collection(path).doc(key);
      await docRef.set({ value });
      console.log(`Created document: ${currentPath}`);
    }
  }
}

// Start the import process
async function startImport() {
  try {
    console.log('Starting data import...');
    await importData(data);
    console.log('Data import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

startImport(); 