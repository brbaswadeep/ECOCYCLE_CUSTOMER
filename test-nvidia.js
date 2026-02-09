
const API_KEY = "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";
const DUMMY_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Plastic_bottle_on_beach.jpg/640px-Plastic_bottle_on_beach.jpg";

async function testNvidia() {
    console.log("Testing NVIDIA API...");
    try {
        const response = await fetch(
            'https://integrate.api.nvidia.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "meta/llama-3.2-11b-vision-instruct",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "What is in this image? Be concise." },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIMFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q=="
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.2,
                    top_p: 0.7
                })
            }
        );


        const text = await response.text();
        console.log("Raw Response:", text);
        const data = JSON.parse(text);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error testing NVIDIA API:", error);
    }
}



testNvidia();
