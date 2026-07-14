// MongoDB initialization script
// Creates the vitaform database with indexes on startup

db = db.getSiblingDB('vitaform');

// Create application user
db.createUser({
  user: 'vitaform_app',
  pwd: 'vitaform_app_secret',
  roles: [{ role: 'readWrite', db: 'vitaform' }],
});

print('✅ MongoDB initialized for vitaform');
