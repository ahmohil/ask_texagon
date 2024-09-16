
const  { createClient } =  require('@supabase/supabase-js');


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

module.exports = {supabaseClient};


// async function fetchData() {
//   const { data, error } = await supabaseClient
//     .from('discord')
//     .select('*');

//   if (error) {
//     console.error('Error fetching data:', error);
//   } else {
//     console.log('Data:', data);
//   }
// }


// fetchData();