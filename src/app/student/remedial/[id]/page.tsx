import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AzotaExamUI from "../../lessons/[id]/AzotaExamUI";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function RemedialExamPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/auth/login");

  const { data: remedial } = await supabase
    .from('remedial_exams')
    .select('*, lessons(title), exam_results(score)')
    .eq('id', params.id)
    .single();

  if (!remedial) return <div className="p-8 text-center text-zinc-500 font-bold">Không tìm thấy bài gỡ điểm.</div>;
  if (remedial.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="bg-white p-12 rounded-[2rem] shadow-xl text-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black">✓</div>
          <h1 className="text-2xl font-black text-emerald-800 mb-2">Đã hoàn thành!</h1>
          <p className="text-emerald-600 font-medium mb-8">Bạn đã làm bài tập gỡ điểm này rồi.</p>
          <Link href="/student/dashboard" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Chuyển đổi questions_data (JSON) thành chuỗi Markdown chứa ```quiz blocks
  let contentStr = '';
  const qData = Array.isArray(remedial.questions_data) ? remedial.questions_data : [];
  qData.forEach((q: any) => {
     contentStr += "```quiz\n" + JSON.stringify(q, null, 2) + "\n```\n\n";
  });

  return (
    <div className="bg-orange-50 min-h-screen pb-12">
      <div className="bg-white border-b border-orange-100 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-40 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Link href="/student/dashboard" className="w-10 h-10 shrink-0 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-800">Bài tập Luyện tập gỡ điểm</h1>
            <p className="text-sm font-medium text-gray-500">Bài học: {remedial.lessons?.title}</p>
          </div>
        </div>
        <div className="bg-orange-100 text-orange-700 px-5 py-2.5 rounded-xl text-sm shadow-inner border border-orange-200 font-medium flex items-center gap-2">
          Điểm bài gốc hiện tại: <strong className="font-black text-lg">{remedial.exam_results?.score} / 10</strong>
        </div>
      </div>
      
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6 bg-white p-5 rounded-2xl border-2 border-orange-200 shadow-sm text-sm text-orange-800 flex items-start gap-3">
          <div className="text-2xl">🔥</div>
          <div>
            <strong className="font-black text-orange-900 block text-base mb-1">Cơ hội cải thiện điểm số!</strong>
            Điểm của bài luyện tập này sẽ được <strong>CỘNG DỒN</strong> trực tiếp vào điểm gốc của bạn. Hãy cố gắng làm thật cẩn thận để đạt trên 7 điểm nhé!
          </div>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="p-2 md:p-6">
            <AzotaExamUI 
              content={contentStr} 
              title="Luyện tập lại" 
              lessonId={remedial.lesson_id} 
              remedialId={remedial.id}
              submitUrl="/api/student/submit-remedial"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
