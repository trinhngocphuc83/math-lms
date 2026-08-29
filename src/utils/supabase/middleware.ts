import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refresh session nếu có
  const { data: { user } } = await supabase.auth.getUser()

  /*
   * Chặn khu Quản trị ngay tại máy chủ.
   *
   * Trước đây chỉ có một câu chặn ở admin/layout.tsx, mà câu đó chỉ xét vai trò 'teacher' -
   * vai trò 'student' đi thẳng qua. Đăng nhập bằng tài khoản học sinh rồi gõ URL
   * /admin/lessons/editor là vào được và đọc được nội dung bài soạn (đã thử trên máy).
   *
   * Chặn ở đây thì đổi mã phía trình duyệt cũng không lọt, vì trang chưa kịp gửi về.
   * Vai trò lấy từ user_metadata - cùng nguồn mà layout đang dùng.
   */
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Thiếu vai trò thì coi như KHÔNG có quyền. Bản cũ mặc định là 'admin' - sai hướng:
    // dữ liệu thiếu mà lại mở toang cửa.
    const vaiTro = (user.user_metadata as any)?.role
    if (vaiTro !== 'admin' && vaiTro !== 'teacher') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url))
    }
  }

  return supabaseResponse
}
