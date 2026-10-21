/**
 * GOOGLE APPS SCRIPT CHO MINIGAME DỰ ĐOÁN SỐ MAY MẮN (Ổ KHOÁ VALI)
 * Dành cho hệ thống Auto Chung Sức - TachiOni
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet của bạn -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa hết code mặc định, dán toàn bộ nội dung file này vào.
 * 3. Tạo tiêu đề cho Sheet1 (dòng 1):
 *    - Cột A (A1): eventCode (Mã sự kiện)
 *    - Cột B (B1): tiktokId (TikTok ID)
 *    - Cột C (C1): predictedNumber (Số dự đoán)
 *    - Cột D (D1): createdAt (Thời gian tham gia)
 * 4. Nhấn nút "Triển khai" (Deploy) -> "Quản lý việc triển khai" hoặc "Triển khai mới" (New deployment).
 * 5. Chọn loại triển khai: "Ứng dụng web" (Web app).
 *    - Mô tả: Lucky Lock Minigame Webhook API
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - your_email@gmail.com)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> BẮT BUỘC để Next.js gọi được mà không cần đăng nhập Google!
 * 6. Nhấn "Triển khai" (Cấp quyền truy cập nếu được hỏi).
 * 7. Copy URL Ứng dụng web (dạng https://script.google.com/macros/s/AKfycb.../exec).
 * 8. Dán vào file `.env.local` của Next.js:
 *    NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return createJsonResponse({ success: true, entries: [] });
    }

    // Đọc 4 cột: eventCode, tiktokId, predictedNumber, createdAt
    var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    var entries = [];

    for (var i = 0; i < values.length; i++) {
      var eventCode = values[i][0] ? String(values[i][0]).trim() : '';
      var tiktokId = values[i][1] ? String(values[i][1]).trim() : '';
      var rawNumber = values[i][2];
      var predictedNumber = (rawNumber !== '' && rawNumber !== null && !isNaN(rawNumber)) 
        ? Number(rawNumber) 
        : 0;
      var createdAt = values[i][3] ? String(values[i][3]) : '';
      
      if (eventCode) {
        entries.push({
          eventCode: eventCode,
          tiktokId: tiktokId,
          predictedNumber: predictedNumber,
          createdAt: createdAt
        });
      }
    }

    return createJsonResponse({ success: true, entries: entries });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString(), entries: [] });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Đợi lock tối đa 10 giây để chống race condition khi nhiều người xem gửi mã cùng lúc
  try {
    lock.waitLock(10000);
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: "Hệ thống đang quá tải, vui lòng thử lại sau vài giây!"
    });
  }

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = {};
    
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action;

    // 1. ACTION: Thêm vé dự đoán
    if (action === "ADD_ENTRY") {
      var eventCode = (payload.eventCode || payload.code || "").toString().trim().toUpperCase();
      var tiktokId = (payload.tiktokId || payload.tiktok || "").toString().trim().replace(/^@+/, "");
      var rawNum = payload.predictedNumber !== undefined ? payload.predictedNumber : payload.number;
      var predictedNumber = (rawNum !== '' && rawNum !== null && !isNaN(rawNum)) ? Number(rawNum) : 0;

      if (!eventCode) {
        return createJsonResponse({
          success: false,
          message: "Mã sự kiện không được để trống!"
        });
      }

      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // Quét cột A kiểm tra trùng mã
        var existingCodes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < existingCodes.length; i++) {
          if (existingCodes[i][0] && String(existingCodes[i][0]).trim().toUpperCase() === eventCode) {
            return createJsonResponse({
              success: false,
              duplicate: true,
              message: "Mã sự kiện này đã được ghi nhận trước đó trên hệ thống!"
            });
          }
        }
      }

      var timeFormatted = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");
      sheet.appendRow([eventCode, tiktokId, predictedNumber, timeFormatted]);

      return createJsonResponse({
        success: true,
        message: "Ghi nhận vé dự đoán thành công! Số may mắn của bạn: " + predictedNumber,
        entry: {
          eventCode: eventCode,
          tiktokId: tiktokId,
          predictedNumber: predictedNumber,
          createdAt: timeFormatted
        }
      });
    }

    // 2. ACTION: Xóa trắng dữ liệu từ dòng 2 (Reset đợt quay)
    if (action === "CLEAR_SHEET") {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return createJsonResponse({
        success: true,
        message: "Đã làm trống danh sách tạm thời trên Google Sheet!"
      });
    }

    return createJsonResponse({
      success: false,
      message: "Hành động (action) không hợp lệ!"
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: "Lỗi Google Apps Script: " + error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
