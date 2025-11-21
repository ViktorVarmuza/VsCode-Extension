import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

//přihlašení přes github :D
async function signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: 'vscode://your-extension-id/callback' // URI pro návrat do VS Code
        }
    });

    if (error) {
        console.error('Chyba při přihlášení přes GitHub:', error.message);
        return false;
    }

    console.log('Otevři prohlížeč pro přihlášení');
    return true;
}
