import os
from PIL import Image, ImageDraw, ImageFont

def draw_lrs():
    width = 3300
    height = 2100
    bg_color = (248, 250, 252) # Slate 50
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Load Fonts
    font_path_reg = "C:\\Windows\\Fonts\\segoeui.ttf"
    font_path_bold = "C:\\Windows\\Fonts\\segoeuib.ttf"

    if not os.path.exists(font_path_bold):
        font_path_reg = "arial.ttf"
        font_path_bold = "arialbd.ttf"

    title_font = ImageFont.truetype(font_path_bold, 44)
    subtitle_font = ImageFont.truetype(font_path_reg, 24)
    table_header_font = ImageFont.truetype(font_path_bold, 22)
    field_font = ImageFont.truetype(font_path_reg, 16)
    badge_font = ImageFont.truetype(font_path_bold, 13)
    conn_font = ImageFont.truetype(font_path_bold, 18)

    # Title
    draw.text((70, 45), "DIAGRAM LRS (LOGICAL RECORD STRUCTURE)", fill=(15, 23, 42), font=title_font)
    draw.text((70, 102), "Sistem Penggajian & Presensi Karyawan (Payroll System)", fill=(71, 85, 105), font=subtitle_font)

    # Legend Box
    legend_x = 2320
    legend_y = 45
    draw.rounded_rectangle([legend_x, legend_y, legend_x + 910, legend_y + 95], radius=10, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    draw.text((legend_x + 20, legend_y + 16), "Keterangan:", fill=(15, 23, 42), font=ImageFont.truetype(font_path_bold, 18))
    
    # PK Badge
    draw.rounded_rectangle([legend_x + 140, legend_y + 15, legend_x + 185, legend_y + 38], radius=4, fill=(217, 119, 6))
    draw.text((legend_x + 150, legend_y + 18), "PK", fill=(255, 255, 255), font=badge_font)
    draw.text((legend_x + 195, legend_y + 17), "Primary Key", fill=(51, 65, 85), font=field_font)

    # FK Badge
    draw.rounded_rectangle([legend_x + 310, legend_y + 15, legend_x + 355, legend_y + 38], radius=4, fill=(25, 118, 210))
    draw.text((legend_x + 320, legend_y + 18), "FK", fill=(255, 255, 255), font=badge_font)
    draw.text((legend_x + 365, legend_y + 17), "Foreign Key", fill=(51, 65, 85), font=field_font)

    # UK Badge
    draw.rounded_rectangle([legend_x + 480, legend_y + 15, legend_x + 525, legend_y + 38], radius=4, fill=(16, 185, 129))
    draw.text((legend_x + 490, legend_y + 18), "UK", fill=(255, 255, 255), font=badge_font)
    draw.text((legend_x + 535, legend_y + 17), "Unique Key", fill=(51, 65, 85), font=field_font)

    # Cardinality
    draw.text((legend_x + 650, legend_y + 17), "1 : N  Satu ke Banyak", fill=(51, 65, 85), font=field_font)
    draw.text((legend_x + 20, legend_y + 58), "1 : 1  Satu ke Satu   |   1 : 0..1  Opsional", fill=(71, 85, 105), font=field_font)

    # Define Entities with fields
    tables = {
        "User": {
            "title": "USER (Akun Sistem)",
            "pos": (80, 240),
            "width": 500,
            "header_color": (30, 41, 59),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("email", "VARCHAR(255)", "UK"),
                ("passwordHash", "VARCHAR(255)", ""),
                ("role", "ENUM(ADMIN, EMP, HR)", ""),
                ("createdAt", "DATETIME", ""),
                ("updatedAt", "DATETIME", ""),
            ]
        },
        "Session": {
            "title": "SESSION (Sesi Login)",
            "pos": (80, 640),
            "width": 500,
            "header_color": (51, 65, 85),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("userId", "VARCHAR(36)", "FK"),
                ("token", "VARCHAR(255)", "UK"),
                ("expiresAt", "DATETIME", ""),
                ("createdAt", "DATETIME", ""),
            ]
        },
        "ActivityLog": {
            "title": "ACTIVITY_LOG (Log Aktivitas)",
            "pos": (80, 980),
            "width": 500,
            "header_color": (51, 65, 85),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("userId", "VARCHAR(36)", "FK"),
                ("actionType", "VARCHAR(50)", ""),
                ("description", "TEXT", ""),
                ("createdAt", "DATETIME", ""),
            ]
        },
        "Position": {
            "title": "POSITION (Jabatan / Golongan)",
            "pos": (760, 240),
            "width": 520,
            "header_color": (15, 118, 110),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("name", "VARCHAR(100)", ""),
                ("baseSalary", "DOUBLE", ""),
                ("allowance", "DOUBLE", ""),
                ("description", "TEXT", ""),
                ("status", "ENUM(ACTIVE, INACTIVE)", ""),
                ("createdAt", "DATETIME", ""),
                ("updatedAt", "DATETIME", ""),
            ]
        },
        "Employee": {
            "title": "EMPLOYEE (Data Karyawan Utama)",
            "pos": (760, 640),
            "width": 560,
            "header_color": (3, 105, 161),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("userId", "VARCHAR(36)", "FK"),
                ("positionId", "VARCHAR(36)", "FK"),
                ("name", "VARCHAR(150)", ""),
                ("email", "VARCHAR(255)", "UK"),
                ("phone", "VARCHAR(30)", ""),
                ("address", "TEXT", ""),
                ("joinedDate", "DATETIME", ""),
                ("gender", "ENUM(MALE, FEMALE)", ""),
                ("birthDate", "DATETIME", ""),
                ("status", "ENUM(ACTIVE, INACTIVE)", ""),
                ("bankName", "ENUM(BCA, BRI, etc)", ""),
                ("bankAccount", "VARCHAR(50)", ""),
                ("accountHolder", "VARCHAR(150)", ""),
                ("department", "VARCHAR(100)", ""),
                ("employmentType", "ENUM(FULL_TIME, ...)", ""),
                ("leaveBalance", "INT", ""),
                ("npwp", "VARCHAR(50)", ""),
            ]
        },
        "Attendance": {
            "title": "ATTENDANCE (Absensi & Presensi)",
            "pos": (1520, 240),
            "width": 520,
            "header_color": (67, 56, 202),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("employeeId", "VARCHAR(36)", "FK"),
                ("date", "VARCHAR(10)", ""),
                ("clockIn", "DATETIME", ""),
                ("clockOut", "DATETIME", ""),
                ("status", "VARCHAR(50)", ""),
                ("browser", "VARCHAR(100)", ""),
                ("device", "VARCHAR(100)", ""),
                ("fotoMasuk", "VARCHAR(255)", ""),
                ("fotoKeluar", "VARCHAR(255)", ""),
                ("ipAddress", "VARCHAR(45)", ""),
                ("latitude", "DOUBLE", ""),
                ("longitude", "DOUBLE", ""),
            ]
        },
        "LeaveRequest": {
            "title": "LEAVE_REQUEST (Pengajuan Cuti / Izin)",
            "pos": (1520, 800),
            "width": 520,
            "header_color": (67, 56, 202),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("employeeId", "VARCHAR(36)", "FK"),
                ("type", "ENUM(CUTI, SAKIT, IZIN)", ""),
                ("startDate", "DATETIME", ""),
                ("endDate", "DATETIME", ""),
                ("reason", "TEXT", ""),
                ("status", "ENUM(PENDING, APP, REJ)", ""),
                ("attachment", "VARCHAR(255)", ""),
            ]
        },
        "Overtime": {
            "title": "OVERTIME (Pengajuan Lembur)",
            "pos": (1520, 1240),
            "width": 520,
            "header_color": (67, 56, 202),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("employeeId", "VARCHAR(36)", "FK"),
                ("payrollId", "VARCHAR(36)", "FK"),
                ("tanggal", "DATETIME", ""),
                ("jamMulai", "VARCHAR(10)", ""),
                ("jamSelesai", "VARCHAR(10)", ""),
                ("totalJam", "DOUBLE", ""),
                ("tarifPerJam", "DOUBLE", ""),
                ("nominalLembur", "DOUBLE", ""),
                ("alasan", "TEXT", ""),
                ("status", "ENUM(PENDING, APP, etc)", ""),
            ]
        },
        "Payroll": {
            "title": "PAYROLL (Gaji & Tunjangan)",
            "pos": (2260, 640),
            "width": 540,
            "header_color": (14, 116, 144),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("employeeId", "VARCHAR(36)", "FK"),
                ("period", "VARCHAR(7)", ""),
                ("baseSalary", "DOUBLE", ""),
                ("allowance", "DOUBLE", ""),
                ("bonus", "DOUBLE", ""),
                ("deduction", "DOUBLE", ""),
                ("overtime", "DOUBLE", ""),
                ("bpjsKesehatan", "DOUBLE", ""),
                ("bpjsKetenagakerjaan", "DOUBLE", ""),
                ("pph21", "DOUBLE", ""),
                ("totalSalary", "DOUBLE", ""),
                ("status", "ENUM(DRAFT, PAID)", ""),
                ("paidAt", "DATETIME", ""),
            ]
        },
        "SalarySlip": {
            "title": "SALARY_SLIP (Slip Gaji Digital)",
            "pos": (2260, 1280),
            "width": 540,
            "header_color": (15, 118, 110),
            "fields": [
                ("id", "VARCHAR(36)", "PK"),
                ("payrollId", "VARCHAR(36)", "FK"),
                ("employeeId", "VARCHAR(36)", "FK"),
                ("qrCodeText", "TEXT", ""),
                ("createdAt", "DATETIME", ""),
                ("updatedAt", "DATETIME", ""),
            ]
        }
    }

    # Store calculated table dimensions & anchor points
    table_coords = {}

    # Render Tables
    for key, t in tables.items():
        x, y = t["pos"]
        w = t["width"]
        header_h = 48
        row_h = 28
        total_h = header_h + len(t["fields"]) * row_h + 12
        
        table_coords[key] = {
            "x": x, "y": y, "w": w, "h": total_h,
            "left": (x, y + total_h // 2),
            "right": (x + w, y + total_h // 2),
            "top": (x + w // 2, y),
            "bottom": (x + w // 2, y + total_h)
        }

        # Card shadow
        draw.rounded_rectangle([x + 4, y + 4, x + w + 4, y + total_h + 4], radius=12, fill=(226, 232, 240))
        # Card Body Background
        draw.rounded_rectangle([x, y, x + w, y + total_h], radius=12, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
        # Header Top background
        draw.rounded_rectangle([x, y, x + w, y + header_h], radius=12, fill=t["header_color"])
        draw.rectangle([x, y + header_h - 10, x + w, y + header_h], fill=t["header_color"])

        # Header Text
        draw.text((x + 16, y + 10), t["title"], fill=(255, 255, 255), font=table_header_font)

        # Fields List
        curr_y = y + header_h + 8
        for field, ftype, key_type in t["fields"]:
            # Key Badge
            if key_type == "PK":
                draw.rounded_rectangle([x + 14, curr_y + 3, x + 44, curr_y + 23], radius=4, fill=(217, 119, 6))
                draw.text((x + 20, curr_y + 4), "PK", fill=(255, 255, 255), font=badge_font)
            elif key_type == "FK":
                draw.rounded_rectangle([x + 14, curr_y + 3, x + 44, curr_y + 23], radius=4, fill=(25, 118, 210))
                draw.text((x + 20, curr_y + 4), "FK", fill=(255, 255, 255), font=badge_font)
            elif key_type == "UK":
                draw.rounded_rectangle([x + 14, curr_y + 3, x + 44, curr_y + 23], radius=4, fill=(16, 185, 129))
                draw.text((x + 20, curr_y + 4), "UK", fill=(255, 255, 255), font=badge_font)

            # Field Name
            draw.text((x + 56, curr_y + 4), field, fill=(15, 23, 42), font=field_font)
            # Field Type
            draw.text((x + w - 190, curr_y + 4), ftype, fill=(100, 116, 139), font=field_font)

            # Separator line
            draw.line([(x + 10, curr_y + row_h), (x + w - 10, curr_y + row_h)], fill=(241, 245, 249), width=1)
            curr_y += row_h

    # Helper to draw clean orthogonal routing lines
    def draw_path(pts, color=(71, 85, 105), width=3, card_start="1", card_end="N"):
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i+1]], fill=color, width=width)
        
        # Start label
        p0, p1 = pts[0], pts[1]
        lbl_x0 = p0[0] + (12 if p1[0] > p0[0] else -28 if p1[0] < p0[0] else 10)
        lbl_y0 = p0[1] + (10 if p1[1] > p0[1] else -30 if p1[1] < p0[1] else -25)
        draw.text((lbl_x0, lbl_y0), card_start, fill=(15, 23, 42), font=conn_font)

        # End label
        pn, pn_prev = pts[-1], pts[-2]
        lbl_xn = pn[0] + (-28 if pn[0] > pn_prev[0] else 12 if pn[0] < pn_prev[0] else 10)
        lbl_yn = pn[1] + (-30 if pn[1] > pn_prev[1] else 10 if pn[1] < pn_prev[1] else -25)
        draw.text((lbl_xn, lbl_yn), card_end, fill=(15, 23, 42), font=conn_font)

    # 1. User -> Employee (1 : 0..1)
    u_right = (table_coords["User"]["x"] + table_coords["User"]["w"], table_coords["User"]["y"] + 150)
    e_left = (table_coords["Employee"]["x"], table_coords["Employee"]["y"] + 100)
    draw_path([u_right, (670, table_coords["User"]["y"] + 150), (670, table_coords["Employee"]["y"] + 100), e_left],
              color=(3, 105, 161), width=4, card_start="1", card_end="0..1")

    # 2. User -> Session (1 : N)
    u_bot = (table_coords["User"]["x"] + 250, table_coords["User"]["y"] + table_coords["User"]["h"])
    s_top = (table_coords["Session"]["x"] + 250, table_coords["Session"]["y"])
    draw_path([u_bot, s_top], color=(71, 85, 105), width=3, card_start="1", card_end="N")

    # 3. User -> ActivityLog (1 : N)
    s_bot = (table_coords["Session"]["x"] + 250, table_coords["Session"]["y"] + table_coords["Session"]["h"])
    a_top = (table_coords["ActivityLog"]["x"] + 250, table_coords["ActivityLog"]["y"])
    draw_path([s_bot, a_top], color=(71, 85, 105), width=3, card_start="1", card_end="N")

    # 4. Position -> Employee (1 : N)
    p_bot = (table_coords["Position"]["x"] + 260, table_coords["Position"]["y"] + table_coords["Position"]["h"])
    e_top = (table_coords["Employee"]["x"] + 260, table_coords["Employee"]["y"])
    draw_path([p_bot, e_top], color=(15, 118, 110), width=4, card_start="1", card_end="N")

    # 5. Employee -> Attendance, LeaveRequest, Overtime (1 : N)
    # Gutter between Column 2 and Column 3 is x = 1420
    emp_r = (table_coords["Employee"]["x"] + table_coords["Employee"]["w"], table_coords["Employee"]["y"] + 400)
    gutter_x = 1420
    draw_line_main = [(emp_r[0], emp_r[1]), (gutter_x, emp_r[1])]
    for pt_a, pt_b in zip(draw_line_main[:-1], draw_line_main[1:]):
        draw.line([pt_a, pt_b], fill=(67, 56, 202), width=3)
    draw.text((emp_r[0] + 12, emp_r[1] - 25), "1", fill=(15, 23, 42), font=conn_font)

    # Branch to Attendance
    att_l = (table_coords["Attendance"]["x"], table_coords["Attendance"]["y"] + 100)
    draw_path([(gutter_x, emp_r[1]), (gutter_x, att_l[1]), att_l], color=(67, 56, 202), width=3, card_start="", card_end="N")

    # Branch to LeaveRequest
    leave_l = (table_coords["LeaveRequest"]["x"], table_coords["LeaveRequest"]["y"] + 100)
    draw_path([(gutter_x, emp_r[1]), (gutter_x, leave_l[1]), leave_l], color=(67, 56, 202), width=3, card_start="", card_end="N")

    # Branch to Overtime
    ot_l = (table_coords["Overtime"]["x"], table_coords["Overtime"]["y"] + 100)
    draw_path([(gutter_x, emp_r[1]), (gutter_x, ot_l[1]), ot_l], color=(67, 56, 202), width=3, card_start="", card_end="N")

    # 6. Employee -> Payroll (1 : N)
    emp_r2 = (table_coords["Employee"]["x"] + table_coords["Employee"]["w"], table_coords["Employee"]["y"] + 200)
    pay_l = (table_coords["Payroll"]["x"], table_coords["Payroll"]["y"] + 100)
    draw_path([emp_r2, (2140, emp_r2[1]), (2140, pay_l[1]), pay_l], color=(14, 116, 144), width=4, card_start="1", card_end="N")

    # 7. Payroll -> SalarySlip (1 : 1)
    pay_bot = (table_coords["Payroll"]["x"] + 270, table_coords["Payroll"]["y"] + table_coords["Payroll"]["h"])
    slip_top = (table_coords["SalarySlip"]["x"] + 270, table_coords["SalarySlip"]["y"])
    draw_path([pay_bot, slip_top], color=(15, 118, 110), width=4, card_start="1", card_end="1")

    # 8. Overtime -> Payroll (N : 0..1)
    ot_r = (table_coords["Overtime"]["x"] + table_coords["Overtime"]["w"], table_coords["Overtime"]["y"] + 160)
    pay_l2 = (table_coords["Payroll"]["x"], table_coords["Payroll"]["y"] + 450)
    draw_path([ot_r, (2140, ot_r[1]), (2140, pay_l2[1]), pay_l2], color=(217, 119, 6), width=3, card_start="N", card_end="0..1")

    # Footer Note
    draw.text((70, 2020), "* Diagram LRS (Logical Record Structure) merepresentasikan entitas, atribut (PK/FK/UK), jenis tipe data, dan hubungan kardinalitas relasional antar tabel.", fill=(100, 116, 139), font=subtitle_font)

    return img

if __name__ == "__main__":
    image = draw_lrs()
    
    paths = [
        "d:/project/web sistem penggajian/lrs_diagram.png",
        "d:/project/web sistem penggajian/sistem-penggajian/lrs_diagram.png",
        "d:/project/web sistem penggajian/sistem-penggajian/diagram_lrs.png",
        "d:/project/web sistem penggajian/sistem-penggajian/public/lrs_diagram.png",
        "d:/project/web sistem penggajian/sistem-penggajian/public/diagram_lrs.png"
    ]
    
    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        image.save(p, "PNG")
        print(f"Saved refined LRS diagram to: {p}")
