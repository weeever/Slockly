import { NextResponse } from 'next/server';
import { analyzePromptStrict } from '@/lib/ai/provider';

export async function POST(req: Request){
  try{
    const { prompt } = await req.json();
    const result = await analyzePromptStrict(prompt||'');
    return NextResponse.json(result);
  }catch(e:any){
    const msg = e?.message || 'analyze failed';
    const code = msg === 'no_ai_provider' ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
