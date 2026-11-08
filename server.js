const express=require('express'),multer=require('multer');
const app=express(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024},fileFilter:(_r,f,cb)=>cb(null,/^image\/(jpeg|png|webp)$/.test(f.mimetype))});
app.use(express.static('public'));
app.get('/api/health',(_q,r)=>r.json({ok:true,configured:Boolean(process.env.DIFY_API_KEY)}));
app.post('/api/analyze',upload.single('image'),async(q,r)=>{
 if(!process.env.DIFY_API_KEY)return r.status(503).json({error:'Koneksi Dify belum dikonfigurasi.'});if(!q.file)return r.status(400).json({error:'Pilih foto terlebih dahulu.'});
 const base=(process.env.DIFY_BASE_URL||'https://api.dify.ai').replace(/\/+$/,''),headers={Authorization:'Bearer '+process.env.DIFY_API_KEY},user=process.env.DIFY_USER_ID||'partvision-web';
 try{const f=new FormData();f.append('file',new Blob([q.file.buffer],{type:q.file.mimetype}),q.file.originalname||'photo.jpg');f.append('user',user);
 const u=await fetch(base+'/v1/files/upload',{method:'POST',headers,body:f}),file=await u.json();if(!u.ok||!file.id)return r.status(502).json({error:'Dify menolak foto. Periksa koneksi API.'});
 const body={inputs:{},query:String(q.body.notes||'Analisis foto komponen ini. Berikan ringkasan kondisi dan keputusan GO atau NO GO.'),response_mode:'blocking',user,files:[{type:'image',transfer_method:'local_file',upload_file_id:file.id}]};
 const w=await fetch(base+'/v1/chat-messages',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await w.json();if(!w.ok||data.code)return r.status(502).json({error:'Chatflow Dify gagal memproses foto. Periksa status dan input workflow.'});r.json({outputs:{answer:data.answer||'Tidak ada jawaban dari Dify.'}});
 }catch(e){console.error('Dify:',e.message);r.status(502).json({error:'Tidak dapat terhubung ke Dify.'})}
});
app.use((e,_q,r,_n)=>r.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({error:e.code==='LIMIT_FILE_SIZE'?'Foto maksimal 15 MB.':'File foto tidak valid.'}));
app.listen(process.env.PORT||3000,'0.0.0.0');
