#!/bin/bash

# MongoDB Local Setup Script
# This script sets up a local MongoDB database with admin user

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== MongoDB Local Setup ===${NC}"
echo ""

# Configuration
DB_NAME="all4x4"
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD=""

# Prompt for password if not provided as argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter password for admin user:${NC}"
    read -s ADMIN_PASSWORD
    echo ""
else
    ADMIN_PASSWORD=$1
fi

if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}Error: Password cannot be empty${NC}"
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
    echo -e "${RED}MongoDB is not installed.${NC}"
    echo ""
    echo "Installation options:"
    echo "1. macOS: brew install mongodb-community"
    echo "2. Use Docker: docker-compose up -d"
    echo "3. Download from: https://www.mongodb.com/try/download/community"
    exit 1
fi

# Determine MongoDB command
MONGO_CMD="mongosh"
if ! command -v mongosh &> /dev/null; then
    MONGO_CMD="mongo"
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}MongoDB is not running. Attempting to start...${NC}"
    
    # Try to start MongoDB
    if command -v brew &> /dev/null; then
        brew services start mongodb-community 2>/dev/null
        sleep 3
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start mongod 2>/dev/null
        sleep 3
    else
        echo -e "${RED}Please start MongoDB manually and run this script again.${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Creating database and admin user...${NC}"

# Create admin user and database
$MONGO_CMD --eval "
try {
    use admin;
    var userExists = db.getUser('$ADMIN_EMAIL');
    if (userExists) {
        print('User $ADMIN_EMAIL already exists. Updating password...');
        db.changeUserPassword('$ADMIN_EMAIL', '$ADMIN_PASSWORD');
    } else {
        db.createUser({
            user: '$ADMIN_EMAIL',
            pwd: '$ADMIN_PASSWORD',
            roles: [
                { role: 'userAdminAnyDatabase', db: 'admin' },
                { role: 'readWriteAnyDatabase', db: 'admin' },
                { role: 'dbAdminAnyDatabase', db: 'admin' }
            ]
        });
        print('Admin user created successfully!');
    }
    
    use $DB_NAME;
    db.grantRolesToUser('$ADMIN_EMAIL', [
        { role: 'readWrite', db: '$DB_NAME' },
        { role: 'dbAdmin', db: '$DB_NAME' }
    ]);
    print('Database $DB_NAME configured!');
} catch (e) {
    print('Error: ' + e);
}
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ MongoDB setup complete!${NC}"
    echo ""
    echo "Update your .env file with:"
    echo ""
    # URL encode @ symbol
    ENCODED_EMAIL=$(echo "$ADMIN_EMAIL" | sed 's/@/%40/g')
    echo -e "${GREEN}MONGO_URI=mongodb://${ENCODED_EMAIL}:${ADMIN_PASSWORD}@localhost:27017/${DB_NAME}?authSource=admin${NC}"
    echo ""
    echo "Note: Make sure MongoDB has authentication enabled in its config file."
else
    echo -e "${RED}❌ Setup failed. Please check the error messages above.${NC}"
    exit 1
fi

