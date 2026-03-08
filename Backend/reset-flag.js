import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env variables.');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetFlag() {
    const { data, error } = await supabase
        .from('profiles')
        .update({ last_auto_growth_run: null })
        .eq('id', 'cc584820-2cc2-494f-8ef9-de24083e81c2');

    if (error) {
        console.log('Error:', error);
    } else {
        console.log('Successfully reset last_auto_growth_run flag to null!');
    }
}
resetFlag();
