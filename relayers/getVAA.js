import axios from 'axios';



export const getVAA = async (digest) => {
  try {
    const response = await axios.get(`http://localhost:4003/vaa/${digest}`);
    // console.log("response",response)
    if (response.status===200){
        console.log("✅ VAA fetched successfully:", response.data.VAA);
        return response.data.VAA;
    }
    else return false;
  } catch (error) {
    console.log("Error fetching VAA");
    return false
  }
};
