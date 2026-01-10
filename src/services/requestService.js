import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

// Helper to calculate distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat_rad = deg2rad(lat2 - lat1);
    const dLon_rad = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat_rad / 2) * Math.sin(dLat_rad / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon_rad / 2) * Math.sin(dLon_rad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

export const findLocalVendors = async (customerLocation, radiusKm = 15) => {
    try {
        // Fetch all vendors (filtering client-side for now as dataset is small)
        // Optimization: In production, use geofire-common for bounding box queries.
        const q = query(collection(db, "vendors"));
        const querySnapshot = await getDocs(q);

        const vendors = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.location && data.location.coordinates) {
                const dist = calculateDistance(
                    customerLocation.lat, customerLocation.lng,
                    data.location.coordinates.lat, data.location.coordinates.lng
                );

                if (dist <= radiusKm) {
                    vendors.push({ id: doc.id, ...data, distance: dist });
                }
            }
        });

        return vendors.sort((a, b) => a.distance - b.distance);
    } catch (error) {
        console.error("Error finding vendors:", error);
        throw error;
    }
};

export const createVendorRequest = async (customerId, customerLocation, itemDetails, vendors) => {
    try {
        const requestData = {
            customerId,
            customerLocation,
            itemDetails,
            vendorIds: vendors.map(v => v.id),
            status: 'pending', // pending acceptance
            createdAt: serverTimestamp(),
            // We store basic details of the item for quick display
            itemName: itemDetails.name || 'Unknown Item',
            itemImage: itemDetails.image || '',
        };

        const docRef = await addDoc(collection(db, "requests"), requestData);
        return docRef.id;
    } catch (error) {
        console.error("Error creating request:", error);
        throw error;
    }
};
