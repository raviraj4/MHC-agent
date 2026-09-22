import { Profile } from "@/types";
import { createClient } from '@supabase/supabase-js'

export async function getUserInfo(userId: string){
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const supabase = createClient(supabaseUrl, anon_key);
    
    const { data, error } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', userId)
                                .single();

    if (error) {
        throw error;
    }

    return data as Profile;
}
