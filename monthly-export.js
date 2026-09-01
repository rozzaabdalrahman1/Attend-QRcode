const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) { res.status(status).json(body); }

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function makeCsv(rows) {
  const headers = ["التاريخ","الوقت","المجموعة","رقم الطالب","اسم الطالب","رقم ولي الأمر","حالة واتساب"];
  return "\uFEFF" + [
    headers.map(csvCell).join(","),
    ...rows.map(r => [
      r.date,r.time,r.group_name,r.number_in_group,r.student_name,r.parent_phone,r.whatsapp_status
    ].map(csvCell).join(","))
  ].join("\r\n");
}

function lastDay(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function targetMonth(req) {
  const q = req.query?.month;
  if (q && /^\d{4}-\d{2}$/.test(q)) return q;
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
}

async function upload(path, csv) {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/monthly-reports/${encodeURIComponent(path)}`,
    {
      method:"POST",
      headers:{
        apikey:SERVICE_ROLE,
        Authorization:`Bearer ${SERVICE_ROLE}`,
        "Content-Type":"text/csv; charset=utf-8",
        "x-upsert":"true"
      },
      body:csv
    }
  );
  if (!response.ok) throw new Error(`Storage ${response.status}: ${await response.text()}`);
}

export default async function handler(req,res) {
  if (!["GET","POST"].includes(req.method)) return json(res,405,{error:"Method not allowed"});
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(res,500,{error:"Missing Supabase server configuration"});

  const now = new Date();
  const automatic = Boolean(req.headers?.["x-vercel-cron"]);
  if (automatic && now.getUTCDate() !== lastDay(now.getUTCFullYear(), now.getUTCMonth()+1))
    return json(res,200,{ok:true,skipped:true,reason:"Not the last day of the month"});

  try {
    const month = targetMonth(req);
    const [year,mon] = month.split("-").map(Number);
    const next = new Date(Date.UTC(year,mon,1));
    const start = `${month}-01`;
    const end = `${next.getUTCFullYear()}-${String(next.getUTCMonth()+1).padStart(2,"0")}-01`;

    const rows = await supabase(`att_attendance?date=gte.${start}&date=lt.${end}&select=id,date,time,student_id,whatsapp_status&order=date.asc,time.asc`);
    const ids = [...new Set((rows||[]).map(r=>r.student_id).filter(Boolean))];

    const students = ids.length
      ? await supabase(`att_students?id=in.(${ids.map(encodeURIComponent).join(",")})&select=id,group_id,number_in_group,name,parent_phone`)
      : [];
    const gids = [...new Set((students||[]).map(s=>s.group_id).filter(Boolean))];
    const groups = gids.length
      ? await supabase(`att_groups?id=in.(${gids.map(encodeURIComponent).join(",")})&select=id,name`)
      : [];

    const sm = new Map(students.map(s=>[s.id,s]));
    const gm = new Map(groups.map(g=>[g.id,g]));
    const report = (rows||[]).map(r=>{
      const s=sm.get(r.student_id)||{}, g=gm.get(s.group_id)||{};
      return {
        date:r.date,time:r.time,group_name:g.name||"",
        number_in_group:s.number_in_group??"",student_name:s.name||"",
        parent_phone:s.parent_phone||"",whatsapp_status:r.whatsapp_status||""
      };
    });

    const filePath=`${month}.csv`;
    await upload(filePath,makeCsv(report));
    await supabase("att_monthly_exports",{
      method:"POST",
      headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({month,file_path:filePath,row_count:report.length})
    });

    return json(res,200,{
      ok:true,month,rowCount:report.length,filePath,
      publicUrl:`${SUPABASE_URL}/storage/v1/object/public/monthly-reports/${encodeURIComponent(filePath)}`,
      automatic
    });
  } catch(e) {
    console.error(e);
    return json(res,500,{error:"Failed to generate monthly report"});
  }
}
