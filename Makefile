# Blackjack Banshee Makefile

.PHONY: deploy clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  deploy  - Update version, commit all changes, and push to origin"
	@echo "  clean   - Remove temporary files"
	@echo "  help    - Show this help message"

# Deploy target - updates version, commits, and pushes
deploy:
	@echo "Updating version..."
	@./update-version.sh
	@echo "Adding all changes..."
	@git add -A
	@echo "Creating commit..."
	@git commit -m "Deploy: Update version to $$(git rev-parse --short HEAD)"
	@echo "Pushing to origin..."
	@git push origin master
	@echo "Deployment complete!"

# Clean temporary files
clean:
	@echo "Cleaning temporary files..."
	@find . -name "*.swp" -delete
	@find . -name "*.swo" -delete
	@find . -name ".DS_Store" -delete
	@echo "Clean complete!"