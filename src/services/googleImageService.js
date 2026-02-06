// Image fetching service for product visualization
// Uses multiple free image APIs for better reliability

// Cache to avoid duplicate API calls
const imageCache = new Map();

/**
 * Fetch product image using multiple sources for reliability
 * @param {string} productName - Name of the product to search for
 * @returns {Promise<string>} - URL of the product image
 */
export async function fetchProductImage(productName) {
    // Check cache first
    if (imageCache.has(productName)) {
        return imageCache.get(productName);
    }

    try {
        // Clean up product name for better search results
        // Keep "Recycled" or "DIY" keywords if they exist to improve relevance for this app context
        const cleanName = productName.replace(/[()]/g, '').trim();
        const query = encodeURIComponent(cleanName);

        // Unsplash API Configuration
        const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
        const unsplashApiUrl = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&content_filter=high`;

        // 1. Try Unsplash API
        try {
            const response = await fetch(unsplashApiUrl, {
                headers: {
                    'Authorization': `Client-ID ${accessKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const url = data.results[0].urls.small; // regular or small is good for cards
                    imageCache.set(productName, url);
                    return url;
                }
            } else {
                console.warn(`Unsplash API error: ${response.status}`);
            }
        } catch (apiError) {
            console.warn("Unsplash API fetch failed, switching to fallback:", apiError);
        }

        // 2. Fallback: Lorem Picsum with seed (consistent but less relevant)
        const seed = cleanName.toLowerCase().replace(/\s+/g, '-');
        const loremPicsumUrl = `https://picsum.photos/seed/${seed}/400/300`;

        imageCache.set(productName, loremPicsumUrl);
        return loremPicsumUrl;

    } catch (error) {
        console.error(`Error fetching image for ${productName}:`, error);
        // Return placeholder on error with product name
        const fallbackUrl = `https://placehold.co/400x300/e8d5c4/6b4423?text=${encodeURIComponent(productName)}`;
        return fallbackUrl;
    }
}

/**
 * Fetch multiple product images in parallel
 * @param {Array<string>} productNames - Array of product names
 * @returns {Promise<Map<string, string>>} - Map of product name to image URL
 */
export async function fetchMultipleProductImages(productNames) {
    const imagePromises = productNames.map(async (name) => {
        const url = await fetchProductImage(name);
        return [name, url];
    });

    const results = await Promise.all(imagePromises);
    return new Map(results);
}

/**
 * Clear the image cache
 */
export function clearImageCache() {
    imageCache.clear();
}
