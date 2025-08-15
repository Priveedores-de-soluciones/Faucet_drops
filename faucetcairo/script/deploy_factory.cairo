#!/bin/bash

# Deployment script for Faucet Factory and Faucet Drops
# Make sure you have set up your environment variables

set -e

echo "🚀 Starting deployment process..."

# Build the contracts
echo "📦 Building contracts..."
scarb build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the compilation errors."
    exit 1
fi

echo "✅ Build successful!"

# Deploy Factory Contract
echo "🏭 Deploying Factory Contract..."

# Replace with your owner address
OWNER_ADDRESS=${OWNER_ADDRESS:-"0x1234567890123456789012345678901234567890"}

FACTORY_CLASS_HASH=$(starkli class-hash target/dev/faucet_cairo_FaucetFactory.contract_class.json)
echo "Factory Class Hash: $FACTORY_CLASS_HASH"

FACTORY_ADDRESS=$(starkli deploy $FACTORY_CLASS_HASH $OWNER_ADDRESS)
echo "✅ Factory deployed at: $FACTORY_ADDRESS"

# Deploy FaucetDrops Contract (to get class hash)
echo "💧 Deploying FaucetDrops to get class hash..."

FAUCET_DROPS_CLASS_HASH=$(starkli class-hash target/dev/faucet_cairo_FaucetDrops.contract_class.json)
echo "FaucetDrops Class Hash: $FAUCET_DROPS_CLASS_HASH"

# Set the FaucetDrops class hash in the factory
echo "🔧 Setting FaucetDrops class hash in factory..."
starkli invoke $FACTORY_ADDRESS set_faucet_drops_class_hash $FAUCET_DROPS_CLASS_HASH

echo "✅ Deployment complete!"
echo ""
echo "📋 Deployment Summary:"
echo "Factory Address: $FACTORY_ADDRESS"
echo "Factory Class Hash: $FACTORY_CLASS_HASH"
echo "FaucetDrops Class Hash: $FAUCET_DROPS_CLASS_HASH"
echo ""
echo "🎯 Next steps:"
echo "1. Save these addresses for your frontend/backend"
echo "2. Create faucets using the factory contract"
echo "3. Fund the faucets with tokens"
echo "4. Set up your backend for claim processing"