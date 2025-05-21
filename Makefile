# Variables
IMAGE_NAME ?= mouse
IMAGE_TAG ?= latest
REGISTRY ?= gcr.io/your-project-id  # Example: gcr.io/your-project-id, ghcr.io/username, or your-private-registry.com
PLATFORMS ?= linux/amd64,linux/arm64

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make build        - Build the Docker image"
	@echo "  make push         - Push the Docker image to registry"
	@echo "  make build-push   - Build and push the Docker image"
	@echo "  make clean        - Remove local Docker image"
	@echo ""
	@echo "Variables:"
	@echo "  REGISTRY          - Container registry URL (default: gcr.io/your-project-id)"
	@echo "  IMAGE_NAME        - Image name (default: mouse)"
	@echo "  IMAGE_TAG         - Image tag (default: latest)"
	@echo "  PLATFORMS         - Target platforms (default: linux/amd64,linux/arm64)"

# Create and use a new builder instance
.PHONY: setup-builder
setup-builder:
	docker buildx create --name multiarch-builder --use || true
	docker buildx inspect --bootstrap

# Build the Docker image
.PHONY: build
build: setup-builder
	docker buildx build --platform $(PLATFORMS) --load -t $(IMAGE_NAME):$(IMAGE_TAG) .

# Push the Docker image to registry
.PHONY: push
push: setup-builder
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) \
		--push .

# Build and push the Docker image
.PHONY: build-push
build-push: setup-builder
	docker buildx build --platform $(PLATFORMS) \
		-t $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) \
		--push .

# Clean up local Docker image
.PHONY: clean
clean:
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) || true
	docker rmi $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) || true 