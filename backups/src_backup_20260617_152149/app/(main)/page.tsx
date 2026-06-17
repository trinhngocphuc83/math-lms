import { 
  Cake, 
  Gift, 
  BookOpen, 
  Users, 
  Calendar, 
  Banknote,
  TrendingUp,
  BookMarked
} from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start space-x-4 relative">
        <div className="bg-amber-400 text-white p-2 rounded-lg mt-0.5">
          <Cake className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-amber-900 text-sm">Sinh nhật sắp tới</h3>
            <span className="bg-amber-200 text-amber-900 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">1 học sinh</span>
          </div>
          <div className="mt-3 bg-white rounded-xl p-3 inline-flex items-center space-x-3 shadow-sm border border-amber-100/50">
            <div className="bg-amber-50 p-2 rounded-lg">
              <Gift className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Nguyễn Hữu Phúc</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">K9_001 · 15 tuổi · còn 2 ngày</p>
            </div>
          </div>
        </div>
        <button className="absolute top-4 right-4 text-amber-300 hover:text-amber-500 transition-colors">
          <span className="text-xl leading-none">&times;</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          icon={<BookOpen className="w-6 h-6 text-white" strokeWidth={1.5} />}
          iconBg="bg-[#38b2ac]"
          title="Lớp đang mở"
          value="6"
          subtitle="lớp học đang hoạt động"
        />
        <StatCard 
          icon={<Users className="w-6 h-6 text-white" strokeWidth={1.5} />}
          iconBg="bg-[#48bb78]"
          title="Học sinh"
          value="21"
          subtitle="đang theo học"
        />
        <StatCard 
          icon={<Calendar className="w-6 h-6 text-white" strokeWidth={1.5} />}
          iconBg="bg-[#ecc94b]"
          title="Điểm danh hôm nay"
          value="0"
          subtitle="bản ghi hôm nay"
        />
        <StatCard 
          icon={<Banknote className="w-6 h-6 text-white" strokeWidth={1.5} />}
          iconBg="bg-[#38b2ac]"
          title="Tổng thu"
          value="300.000"
          unit="đ"
          subtitle="tổng doanh thu"
        />
      </div>

      {/* Two Columns Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Col */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-5 h-5 text-[#0f6f60]" />
            <h3 className="font-semibold text-gray-800">Học phí gần đây</h3>
          </div>
          <div className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="font-medium text-gray-800 text-sm">Nguyễn Hữu Phúc</p>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                17/05/2026
                <Banknote className="w-3 h-3 ml-1" />
              </p>
            </div>
            <div className="font-bold text-[#0f6f60] text-sm">
              300.000 đ
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <BookMarked className="w-5 h-5 text-[#0f6f60]" />
            <h3 className="font-semibold text-gray-800">Lớp học đang mở</h3>
          </div>
          
          <div className="space-y-5">
            <ClassItem name="Toán 11" subject="Toán" />
            <ClassItem name="Anh 6" subject="Toán" />
            <ClassItem name="Toán 9" subject="Toán" />
            <ClassItem name="Toán 9A" subject="Toán · Thứ 2 (7h30-9h), Thứ 4 (7h30-9h), Thứ 6 (7h30-9h)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, title, value, subtitle, unit }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 p-6 flex items-center space-x-5 transition-transform hover:-translate-y-1 duration-300">
      <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-sm ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[13px] text-gray-500 font-medium mb-1">{title}</p>
        <div className="flex items-baseline space-x-1">
          <h4 className="text-3xl font-extrabold text-gray-800 tracking-tight">{value}</h4>
          {unit && <span className="text-xl font-bold text-gray-800">{unit}</span>}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function ClassItem({ name, subject }: any) {
  return (
    <div className="flex justify-between items-center group">
      <div>
        <p className="font-semibold text-gray-800 text-sm group-hover:text-[#0f6f60] transition-colors">{name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{subject}</p>
      </div>
      <span className="bg-[#eaf5f3] text-[#0f6f60] text-[11px] px-3 py-1 rounded-full font-semibold border border-[#0f6f60]/10">
        Đang mở
      </span>
    </div>
  );
}
