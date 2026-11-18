# VNext — checkpoint M0–M1, 18/11/2026

## Trạng thái bàn giao

Đã thực hiện trên bản sao Git của nhánh `version-1`, giữ nền tảng Phaser / React / Fastify / Prisma / PostgreSQL. Nhánh công việc là `codex/vnext-m1`, xuất phát từ `e36a57bf83bded68d22a19818c5ca89cc2014cb1`.

Mã sản phẩm được chốt để kiểm tra tại `3ac3fe5ed078347145b0199cd136c9a6c05939fa`. Gói bàn giao có thêm bộ kiểm thử trình duyệt và hồ sơ kết quả sau commit này; commit/tree chính xác của cả gói nằm trong `delivery-manifest.json` đi kèm ZIP và Git bundle.

Đây là checkpoint phát triển có mã nguồn, tài nguyên nguyên bản và bằng chứng game chạy thật. **Chưa nghiệm thu đầy đủ M1 và chưa hoàn thành toàn bộ VNext.** Ngưỡng FPS chưa đạt trên môi trường đo hiện có; các giới hạn hình ảnh, focus và Windows được ghi riêng bên dưới.

Kết nối GitHub được kiểm tra có quyền đọc nhưng không có quyền ghi (`pull: true`, `push: false`). Không đẩy commit, tạo PR hay sửa nhánh từ xa. Gói bàn giao giữ lịch sử commit để người có quyền ghi có thể kiểm tra và tích hợp.

## 1. Những thay đổi chính

| Nhóm | Thay đổi đã thực hiện | Bằng chứng và giới hạn |
| --- | --- | --- |
| Di chuyển và va chạm | Dùng cùng hình học cho server và dự đoán client; bước quét, trượt cạnh, góc chéo, né và kỹ năng lướt đều tôn trọng vật cản. Đường bay kiểm tra vật cản. | Kiểm tra hình học, kỹ năng và các route thật; có đi thực tế ở làng/rừng. Không viết lại thuật toán tìm đường của quái. |
| Phiên chơi và lưu vị trí | Một socket hiện hành, bảo vệ khỏi socket cũ, lấy map/vị trí server khi vào game, tự lưu vị trí, đổi map sạch đối tượng cũ. | Reload ở rừng giữ đúng map/vị trí; reconnect nhận TICK mới; phép đo phía server xác nhận một socket OPEN sau reload. |
| UI và input | I/M mở bảng thật; bảng/hội thoại chặn điều khiển nhưng giữ gói trung tính; mất focus xóa ý định điều khiển; HUD và map panel thích ứng hai độ phân giải. | 19 kiểm tra trình duyệt ở bản tích hợp. Đổi focus vật lý chưa quan sát được trong Chromium headless hiện có. |
| Hành động và camera | Xác nhận kỹ năng theo cooldown server, không chạy VFX cho ô chưa học; xử lý xác nhận đến chậm và callback bị thay thế; nội suy camera theo thời gian. | Kiểm tra hành vi client và video game thật. Build không được dùng làm bằng chứng FPS. |
| Nhiệm vụ | Sửa điều kiện tiên quyết, tiến độ nhặt tài nguyên/chiến lợi phẩm, TALK theo NPC/map/vị trí thật, hiển thị nhiệm vụ đã hoàn thành nhưng chưa nhận thưởng. Nhận thưởng làm mới túi đồ. | Route thật và regression UI; phiên tiếp nối dùng chính nhân vật từ phiên chơi đầu. |
| Đan dược và tài sản | HTTP và WebSocket dùng chung giao dịch trừ đúng một vật phẩm; hồi HP/MP vào nhân vật đang mô phỏng sau commit. Bán và dùng cùng chồng vật phẩm dùng thứ tự khóa nhất quán. | HP 61→111/115, số lượng 5→4; rollback, cạnh tranh request, người đã chết, dữ liệu offline và hai chồng cùng loại đều được kiểm tra. |
| Boss | Hồi sinh người chơi hoặc boss khôi phục chỉ số gốc; cảnh báo đã phát giữ vị trí/thời điểm và chỉ quyết toán một lần, rồi mới bắt đầu cooldown. Boss đã quyết toán giữ đúng lịch hồi sinh riêng. | 9 kiểm tra vòng đời; boss đã bị hạ trong phiên chơi sau sửa. Giữ sát thương, tầm và thời gian báo đòn đã thiết kế. |
| Trang bị và tu vi | Trang bị/đột phá làm mới chỉ số phiên đang mở, giữ tỷ lệ HP/MP; mở kỹ năng thứ ba ở tầng thực sự đạt được; giữ bốn ô chủ động. | Route thật kiểm tra cả ba hướng tu và ô nhân vật đang chọn. Chưa có migration bổ sung kỹ năng bị thiếu cho save đã vượt tầng cũ. |
| Mỹ thuật và cảnh | Kiếm Tu đủ bộ trạng thái, ba NPC, quái/boss, công trình và vật cảnh riêng; nền đúng kích thước map, đường nối điểm dịch vụ, nền móng thể hiện vật cản, cổng bắc nhìn thấy được. | Nguồn, bản xuất, metadata, ảnh tích hợp và video đều có. Pháp Tu/Thể Tu cùng vùng sau vẫn dùng phần hình ảnh cũ được ghi rõ. |
| Âm thanh và hiệu ứng | Bốn âm thanh tổng hợp nguyên bản; phản ứng khi mất HP, kỹ năng, đánh và né; có giảm hiệu ứng/tắt rung và lưu lựa chọn. | Có kiểm tra tích hợp/tùy chọn; bản quay không có audio. Không tuyên bố đã nghe kiểm tra đầu ra âm thanh. |
| Launcher và cấu hình | Chọn một cấu hình nhất quán trước khi Prisma khởi tạo; truyền đúng cổng backend cho HTTP/WebSocket; build cả main/renderer; kiểm tra trạng thái sẵn sàng và mã thoát thật. Auto-Setup chỉ tự đồng bộ/seed database loopback được khai báo development. | Fixture TCP/process, Prisma được generate thật và UI Chromium với IPC giả lập. Kết quả che thông tin trong log xuất được rà soát riêng. Chưa thử GUI Windows thật. |

Không thay schema, không xóa save thật, không truy cập cơ sở dữ liệu sản xuất. Toàn bộ đăng ký, chiến đấu và thử cạnh tranh giao dịch dùng tài khoản thử trong PostgreSQL riêng.

### Sửa bổ sung sau rà soát tích hợp

[Rà soát toàn nhánh](../evidence/reviews/whole-branch-review.md) tìm được tám lỗi Important. [Báo cáo sửa và lệnh kiểm tra](../evidence/reviews/final-repair-report.md) giữ cả kết quả RED, GREEN và lần thử lỗi do fixture. Các thay đổi gồm:

| Tình huống | Hành vi sau sửa |
| --- | --- |
| Đổi ô hoặc có cửa sổ mới nhận quyền điều khiển | Server xếp thứ tự AUTH và đổi/tạo ô theo tài khoản, thu hồi socket cũ và chờ lưu vị trí. Client bị thay kết thúc phiên, bỏ input/dự đoán, hiện lý do cùng nút tải lại. Reconnect do lỗi mạng vẫn gắn với nhân vật mà cửa sổ đó đã mở. |
| Hồi phục tại điểm an toàn | HP/MP của phiên đang chạy khớp trần hiện tại; dữ liệu offline chỉ sửa các trường hồi phục dưới khóa. Không dùng thao tác này để bỏ qua trạng thái chết. |
| Uống đan đúng lúc chịu đòn/chết hoặc giao dịch hoàn tất chậm | Xét lại đúng nhân vật và vòng đời trước khi giữ hiệu ứng; sau commit áp dụng hồi phục rồi xử lý các tick/input đã đến theo thứ tự, giữ thời điểm gốc. Rollback không cấp hồi phục. |
| Người chơi hồi sinh khi boss đã được quyết toán | Giữ boss đã chết tới đúng lịch hồi sinh riêng; lần sống mới mở một lần quyết toán mới. |
| Launcher gặp dịch vụ lạ trên cổng quen thuộc | Kiểm tra status, kiểu nội dung, nhận dạng backend và marker của frontend. Mở Game/Admin kiểm tra lại đích; giữ quy tắc chỉ điều khiển tiến trình do launcher tạo. |
| Lệnh thử ghi vào database không phù hợp | Đòi đích PostgreSQL loopback trực tiếp có tên kết thúc `_test`; từ chối đích thường/remote, tham số đổi host/database và chế độ production. |
| Log seed chứa nhãn mật khẩu tiếng Việt | Seed chỉ in tên tài khoản chủ; lớp xuất log che cả nhãn “Mật khẩu”, áp dụng cho TXT, ZIP và log lịch sử. |
| Gửi lại yêu cầu đột phá | Yêu cầu mang nhân vật và tầng xuất phát. Retry của lần đã thành công ngay trước đó trả kết quả thành công mà không trừ tiếp; yêu cầu thuộc ô khác hoặc tầng cũ không hợp lệ bị từ chối. |

Client và backend cần cập nhật cùng phiên bản. API đột phá hiện yêu cầu `{characterId, realmIndex, realmTier}`; POST rỗng hoặc payload thiếu/sai trả 400, yêu cầu lệch nhân vật/tầng trả 409. Nút tải lại trên màn hình kết thúc phiên là hành động chủ động mở phiên mới; tab cũ không tự tranh lại quyền sau thời gian chờ hoặc sự kiện focus.

## 2. Tài nguyên nguyên bản

Nguồn nằm trong `art/vnext/source`, prompt trong `art/vnext/prompts`, quy chuẩn trong `ART_DIRECTION.md`, bản xuất tại `client/public/assets/vnext`. Hai manifest liên kết tên file, kích thước, cell nguồn, thời lượng và SHA-256. Hướng dẫn tái xuất nằm trong [art/vnext/README.md](../../art/vnext/README.md).

Có **39 tài nguyên xuất: 35 PNG và 4 WAV**. Nguồn được tạo riêng bằng công cụ tạo ảnh; không lấy bộ sprite của trò chơi tham khảo. Các bước crop, alpha, căn chân và đóng sheet được xử lý kỹ thuật bằng script. Các bản nguồn cũ được giữ để thấy quá trình sửa; game dùng walk-v3 và combat-v3.

Kiếm Tu dùng frame 64×64, mốc chân (32,56), thứ tự hướng trên/trái/dưới/phải. Bộ trạng thái gồm idle, walk, slash, cast, dodge, hurt, death và respawn. NPC dùng một hàng bốn pose; quái dùng một hàng sáu pose. Sói đen dùng biến thể màu của sói, **không được tính là một bộ hình quái mới**.

Ảnh game chứng minh nhân vật toàn thân và không có aura thường trực. Rà soát hình ảnh không thấy lỗi mất chi hoặc cắt cơ thể rõ rệt trong phần đã xem. Tuy nhiên, hai chân khi bước ngang còn khó phân biệt ở kích thước quay; các frame được lấy mẫu chưa đủ chứng minh mốc chân ổn định trong toàn chu kỳ. Hiệu ứng cổng che một phần chuyển tiếp hồi sinh. Đây là phần chưa xác minh đầy đủ, không được đổi tên thành “đã đạt”.

## 3. Bằng chứng chạy thật

### Phiên chơi đầu và video

[playthrough-m1/session-result.json](../evidence/playthrough-m1/session-result.json) ghi **918,278 giây**, **17.623 TICK**, 54 lệnh, ba lệnh thất bại được giữ lại và không có lỗi JavaScript chưa xử lý. Phiên có các quãng dừng để kiểm tra và ghi nhận lỗi; không phải 15 phút liên tục di chuyển.

Những việc đã ghi được: bốn hướng đi, đánh/né/thi triển, hội thoại ba NPC, đi cổng bắc và rừng, ba sói xám, trúng đòn/chết/trở về điểm an toàn, mở rương, thử lại rương, tùy chọn sau reload và chuyển qua ba ô nhân vật. Phiên này tái hiện hai lỗi đã được sửa sau đó: nhiệm vụ COMPLETED bị ẩn và đan dược bị trừ nhưng không hồi HP trực tiếp.

[runtime-demo.mp4](../evidence/runtime-demo.mp4) dài **85 giây**, ghép các khoảng quay thật ở tốc độ 1×. [clip-edit.json](../evidence/playthrough-m1/clip-edit.json) ghi các khoảng nguồn. File video mã hóa 25 fps, không có audio; con số mã hóa này **không phải FPS game**. Bản ghi dài thô là dữ liệu trung gian, không nằm trong Git; clip bàn giao và các số đo/ảnh được giữ trong repository.

### Phiên tiếp nối nhiệm vụ

Client được build/freeze khi HEAD là `287dd8c`; backend được khởi động lại khi HEAD là `96470e7`. Hai nhận dạng được lưu riêng trong [playthrough-quests/client-build.json](../evidence/playthrough-quests/client-build.json) và [backend-start.json](../evidence/playthrough-quests/backend-start.json). Cả hai stamp ghi rõ có thay đổi chưa commit, cùng mã băm diff; không gọi đây là bản build từ một checkout sạch. Frontend được đóng băng nên các chỉnh sửa tiếp theo không gây HMR. Backend-start là hồ sơ thao tác khởi động và TICK quan sát được, không phải endpoint tự chứng thực commit.

[playthrough-quests/session-result.json](../evidence/playthrough-quests/session-result.json) ghi **750,163 giây**, **14.660 TICK**, 47 lệnh và không có lỗi JavaScript. Nhân vật từ phiên đầu đã nhận thưởng main01, nhặt hai thảo dược, hạ hai sói đen, nhận thưởng main02, mở rương thứ hai và đột phá bằng tiến trình bình thường lên tầng 2. Bốn lần chết và ba lệnh di chuyển/đánh thất bại được giữ nguyên; một số lần chết xảy ra khi dừng kiểm tra ở vị trí không an toàn. Hai lần thử boss giúp tái hiện lỗi reset chỉ số cuồng nộ và cảnh báo chồng nhau, đã được sửa sau đó.

### Boss, phần thưởng và trang bị sau sửa

[playthrough-boss/session-result.json](../evidence/playthrough-boss/session-result.json) ghi **315,885 giây**, **5.995 TICK**, 49 lệnh, không chết và không có lỗi JavaScript. Client và backend cùng ở `795be99`, stamp sạch. Nhân vật đi tới boss bằng WASD, đánh/né/thi triển bằng điều khiển bình thường và hạ boss trong 12,801 giây; không chỉnh chỉ số hay cấp đồ cho nhân vật này.

Sau trận, Hồi Nguyên Đan đưa HP từ **90 lên 135/135** và bị trừ một viên. Đan MP hồi 40 theo hiệu ứng; ảnh sau đó hiện 51/72 MP, có thêm hồi tự nhiên trong thời gian thao tác. Nhân vật trở lại làng, nói chuyện trưởng lão và nhận thưởng main03. Cả ba nhiệm vụ đầu chuyển sang `TURNED_IN`.

Ngay sau nhận thưởng, túi đồ hiện **hai Linh Giáp Vệ**, khớp API trước khi reload hoặc thao tác trang bị. Một món có từ boss và một món từ nhiệm vụ. Đã mặc một trong hai món sau khi nhận thưởng; hàng được mặc chính là món đã có trước phần thưởng nhiệm vụ. HP tối đa tăng **135→160**, phòng ngự tăng **14→22**; ATK 26 và MP tối đa 72 giữ nguyên. Tải lại giữ giáp, 605 linh thạch và cả ba nhiệm vụ đã nhận thưởng. Reconnect nhận TICK từ kết nối mới; quan sát ở document hiện hành có một socket.

Lệnh trang bị đầu tiên thất bại vì bộ kiểm thử chọn trùng tên nút bộ lọc và nút hành động. Sau đó nút hành động đã được bấm bằng chuột tại vị trí nhìn thấy trên ảnh, rồi kiểm tra chỉ số/túi đồ trước và sau reload. Đây là lỗi bộ điều khiển thử nghiệm, vẫn được giữ trong hồ sơ; không sửa dữ liệu để bỏ qua bước trang bị. [quest-gear-result.json](../evidence/playthrough-boss/quest-gear-result.json), [commands.json](../evidence/playthrough-boss/commands.json) và các ảnh cùng thư mục lưu đối chiếu. Bộ kiểm thử đã sửa cả chọn nhầm nút lẫn phân biệt các món trùng tên bằng trạng thái đang mặc; phép thử riêng [equipment-controller-check/assertions.json](../evidence/equipment-controller-check/assertions.json) qua 11 lệnh tháo/mặc/reload với hai món giống nhau, không có lỗi lệnh hoặc lỗi trang.

Các số socket tổng 5/1/3 trong ba phiên là tổng số kết nối từng mở xuyên qua reload/reconnect, không phải số đang mở đồng thời. Bằng chứng phía server về số kết nối đồng thời nằm ở phép đo riêng bên dưới.

[boss-quest-demo.mp4](../evidence/boss-quest-demo.mp4) là clip bổ sung 68 giây từ chính phiên sau sửa, gồm trận boss, đan dược, nhận thưởng, mặc giáp, reload/reconnect và góc va chạm trước đại điện. Các khoảng cắt được ghi trong [playthrough-boss/clip-edit.json](../evidence/playthrough-boss/clip-edit.json); giữ tốc độ 1×, không có audio và không dùng số fps mã hóa làm số đo game.

### Các kiểm tra trình duyệt khác

- [client-handoff/result.json](../evidence/client-handoff/result.json): trên mã sản phẩm sạch `3ac3fe5`, frontend được build/freeze mới, **19/19 kiểm tra trong 72,713 giây**, không có lỗi JavaScript. Backend được khởi động từ cùng commit; hash build và bộ điều khiển được lưu riêng.
- [terminal-handover-browser/result.json](../evidence/terminal-handover-browser/result.json): **8/8 kiểm tra bằng hai trang game thật trong 15,262 giây**. Tab bị thay hiện màn hình kết thúc, không tạo thêm socket hoặc gửi input qua khoảng chờ 3,6 giây và sự kiện focus tổng hợp; tab thay thế nhận thêm 76 TICK. Nút tải lại chủ động chuyển quyền về phiên mới. Không suy ra kiểm chứng focus vật lý từ sự kiện tổng hợp.
- [client-verified/result.json](../evidence/client-verified/result.json): 19 kiểm tra, 74,7 giây, 1.227 TICK, không có lỗi trang.
- [art-integration-smoke/result.json](../evidence/art-integration-smoke/result.json): 19 kiểm tra sau tích hợp hình ảnh, 74,4 giây, không có lỗi trang; có ảnh hai độ phân giải.
- [server-socket-probe/result.json](../evidence/server-socket-probe/result.json): sau reload phía server có OPEN=1, CLOSING=0, tổng=1.
- [focus-probe/result.json](../evidence/focus-probe/result.json): hai tab vẫn bị môi trường headless báo đang visible/focused, nên kết quả đổi focus vật lý là **chưa kết luận**. Kiểm tra hàm reset input và cách gắn sự kiện được ghi riêng.

Các lần thử thất bại ban đầu vẫn được giữ. Lỗi do bộ điều khiển thử nghiệm, như chọn thẻ nhân vật trước khi danh sách tải xong hoặc chọn tọa độ nước làm đích đi, không được tính thành kiểm tra game đã qua.

Lần [preflight trước lượt cuối](../evidence/client-handoff-initial/README.md) dừng vì wrapper gọi thuộc tính `Response.ok` của Node Fetch như một hàm; backend vẫn trả HTTP 200, chưa có build hay kiểm tra game. Wrapper đã được sửa, giữ nguyên mã sản phẩm, rồi chạy lượt đạt trên. [Hồ sơ lệnh cuối](../evidence/final-verification/client-handoff-command-result.json) giữ exit 0 và hash stdout. Stdout vẫn có thông báo Vite WebSocket proxy `ECONNRESET` quanh lúc đóng kết nối; “không có lỗi trang” không có nghĩa toàn bộ lệnh không in thông báo lỗi nào.

## 4. Hiệu năng: CHƯA ĐẠT

Ngưỡng yêu cầu là trung bình ít nhất 55 FPS và p95 frametime không quá 25 ms sau tải ban đầu, với người chơi, 10 quái hoạt động, một boss và kỹ năng.

| Baseline sau tích hợp art | FPS trung bình | p95 frametime | Cửa sổ đo |
| --- | ---: | ---: | ---: |
| 1366×768 | 17,09 | 153,4 ms | 45,28 giây |
| 1920×1080 | 10,85 | 245,3 ms | 45,16 giây |

Nguồn: [performance-art-baseline/result.json](../evidence/performance-art-baseline/result.json). Mọi frame được ghi trong hai phép đo đều có đủ 10 quái thường đang hoạt động, một boss và người chơi còn sống hiện trong camera. Phép đo đối chiếu snapshot với sprite thực, kiểm tra độ mới của snapshot và thời gian phủ của mẫu; không dùng số tick server để thay số khung hình.

Phép đo bổ sung ở mã nguồn `afa7fd2` đã build frontend mới, kiểm tra bốn kỹ năng, socket và đo lại cả hai độ phân giải:

| Đo tại `afa7fd2` | FPS trung bình | p95 frametime | Tải và kết quả |
| --- | ---: | ---: | --- |
| 1366×768 | **20,95** | **110,5 ms** | Đủ tải ở mọi frame ghi được, 7 lần thi triển; **chưa đạt** |
| 1920×1080 | **11,72** | **229,0 ms** | Đủ tải ở mọi frame ghi được, 7 lần thi triển; **chưa đạt** |

Nguồn: [performance-final/result.json](../evidence/performance-final/result.json). Hai cửa sổ đều hơn 45 giây, phủ lần lượt 99,93% và 99,74%; không có lỗi trang hay lỗi dọn dẹp. Bốn ô kỹ năng đã qua chi phí MP 15/25/50/35, cooldown 1,5/3/6/4,5 giây, đạn thật và lướt 160 px. Nhân vật thử được chuẩn bị riêng để mở đủ bốn ô và sống dưới tải. Nhân vật đi nhiệm vụ bình thường mới mở hai ô; hai cách kiểm chứng không thay thế nhau.

Lần thử ngay trước đó dừng trước khi vào game vì bộ kiểm thử để cấu hình backend lọt vào môi trường build frontend. Hồ sơ [performance-final-initial/result.json](../evidence/performance-final-initial/result.json) vẫn được giữ. Bộ đóng băng build đã sửa để chỉ rõ production và API cùng origin `/api`; lần đo tại `afa7fd2` ghi các đầu vào này trong manifest và thu lại cùng mã băm frontend với phiên boss. Lần thử lỗi không có FPS để báo cáo.

Sau đợt sửa tích hợp, phép đo mới ở `25a7864` được giữ riêng trong [performance-handoff/result.json](../evidence/performance-handoff/result.json): **18,80 FPS / p95 141,6 ms** tại 1366×768 và **11,14 FPS / p95 229,0 ms** tại 1920×1080. Hai cửa sổ đều hơn 45 giây, đủ tải ở mọi frame ghi được, bảy lần thi triển, không có lỗi trang hoặc dọn dẹp; vẫn **chưa đạt**. [Hồ sơ lệnh và mã thoát](../evidence/final-verification/performance-handoff-command-result.json) đối chiếu trực tiếp kết quả đã lưu của bộ chạy: exit 1. Đây là số đo gần nhất, giữ nguyên commit gốc; bản sửa nối lại phiên sau đó được kiểm tra riêng và không được gán lại số đo cũ.

Máy thử là Linux, Xeon Platinum 8573C, 9 CPU logic được báo cho tiến trình, khoảng 10,45 GB RAM, Chromium 153.0.8010.0, DPR 1, ANGLE/SwiftShader Vulkan chạy bằng phần mềm. Kết quả không đại diện cho một máy có GPU phần cứng, nhưng vẫn là **không đạt trong môi trường đã đo**.

[renderer-diagnostic/README.md](../evidence/renderer-diagnostic/README.md) so sánh WebGL và Canvas trên cùng bản build/điều kiện. Canvas nhanh hơn nhưng vẫn không đạt ngưỡng, đồng thời làm mất tint màu ở một số vật thể. Không chuyển mặc định sang Canvas dựa trên thử nghiệm này. Thời gian đồng bộ update/render của Phaser nhỏ hơn phần lớn độ trễ khung hình, nhưng chưa tách riêng được raster/compositing/scheduling của trình duyệt. Bước tiếp theo là đo trên máy WebGL phần cứng rồi tối ưu theo profile thực.

## 5. Kiểm kê nội dung và giới hạn

[content-inventory/data-records.json](../evidence/content-inventory/data-records.json) đếm trực tiếp registry TypeScript: 36 kỹ năng, 150 mẫu vật phẩm, 56 nhiệm vụ, 20 bản ghi boss, 40 bản ghi quái, 10 map, 8 chương, 3 kết cục và 6 linh thú. **Đây là số bản ghi dữ liệu hiện có**, không phải xác nhận từng nội dung có mỹ thuật riêng, vòng chơi hoàn chỉnh hay đã được chơi hết.

Phần còn lại gồm:

- Hoàn thiện nghiệm thu hình ảnh động ở kích thước chơi, che khuất tên NPC dược sĩ, focus thật và ngưỡng hiệu năng.
- Mỹ thuật riêng và kiểm chứng vòng chơi đầy đủ cho Pháp Tu/Thể Tu; các hoạt động, vùng, chương và kết cục của M2–M3.
- Kiểm thử GUI Windows, icon launcher mới, đóng gói và đường chạy production. Bản `server/npm start` đã có vấn đề đường dẫn output/ESM từ trước; không được dùng build TypeScript thành công để tuyên bố bản production đã chạy được.
- Launcher console cũ còn các vấn đề tính di động/quản lý cổng cần xử lý ở M4; checkpoint này tập trung launcher GUI và đường chạy source được nêu trong báo cáo kiểm tra.
- Save đã vượt tầng mở kỹ năng thứ ba cũ chưa được tự sửa bù. Không có migration âm thầm trên dữ liệu người chơi.
- Debug hiện dùng nhãn Ping cho chênh lệch thời gian snapshot, chưa phải phép đo RTT; cần đọc đúng giới hạn của chỉ số này.
- Tính đường mòn trong làng còn lặp khi dựng cảnh; thao tác click NPC ở rìa 97–115 px có thể mở hội thoại trước khi đủ khoảng TALK 96 px của server. Phím E gợi ý ở 90 px. Các kiểm tra chuyên biệt mới cần chạy bằng lệnh riêng vì chưa được gom hết vào lệnh test tổng.
- Bộ theo dõi heartbeat ở biên giao dịch đan dược còn có thể đọc trạng thái trước hàng đợi; trường hợp sát mốc 5 giây có thể gây nhịp pause/resume bất tiện. Launcher có thể giữ tóm tắt Start All cũ tới lượt probe kế tiếp khi dịch vụ bên ngoài bị thay; thao tác Mở Game kiểm tra lại đích trước khi mở.
- Việc lưu vị trí cuối khi đổi ô được chờ hoàn tất nhưng vẫn là lần ghi riêng sau khi chọn ô. Sự cố tiến trình/database ở giữa hai lần ghi có thể để lại vị trí bền vững trước đó. Phục hồi thưởng sau crash, phối hợp nhiều tiến trình, các mặc định triển khai và bảo mật hạ tầng chưa được nghiệm thu.

## 6. Kiểm tra hồi quy và hồ sơ

| Nhóm kiểm tra | Kết quả đã ghi | Phạm vi |
| --- | ---: | --- |
| Hành vi client sau sửa tích hợp | 28/28 | Lifecycle, input, dự đoán, action/camera, presentation, đăng ký, nhận thưởng/túi đồ, payload đột phá và kết thúc phiên bị thay |
| Server regression sau sửa tích hợp | 69/69 | 18 hình học/AOE, 42 route/session/giao dịch, 9 vòng đời boss |
| ARPG hiện có | 27/27 | Quy tắc chiến đấu, giá trị kỹ năng, i-frame, các ô nhân vật và quyết toán |
| Security/death hiện có | 26/26 | Những ca cụ thể trong suite; không đồng nghĩa bảo mật tuyệt đối |
| M1 content hiện có | 17/17 | Những ca cụ thể của vùng/nhiệm vụ/rương |
| Phase3 hiện có | 20/20 | Những ca dữ liệu/logic hiện có; không chứng minh M3 đã có vòng chơi hoàn chỉnh |
| Tài nguyên | 39/39 | Hash bản xuất khớp hai manifest |
| Launcher core / encoding / setup | 71/71 · 30/30 · 19/19 | TCP, process, nhận diện game, file, log xuất thật trong fixture tạm; runner lỗi cố ý trả mã 1 |
| Cấu hình / Prisma / proxy | 9/9 · 1/1 · 2/2 | Matrix cấu hình, entry server với client Prisma được generate thật, HTTP và WebSocket Vite |
| Đích database kiểm thử | 6/6 | Chấp nhận đích thử trực tiếp ở loopback, từ chối database thường/remote/override và production; không kết nối đích bị từ chối |
| Renderer launcher | 3/3 | Trạng thái lỗi/cảnh báo/sẵn sàng trong Chromium với IPC giả lập |

Log và lệnh trước đợt sửa rộng được ghi ở [final-verification/server-results.json](../evidence/final-verification/server-results.json); năm lệnh đều kết thúc mã 0 tại `afa7fd2`, nguồn game sạch. Đợt sửa rộng chạy lại các suite tại `25a7864`. Riêng client 28 ca, route/session 42 ca và hai build client/server được chạy lại sau sửa kết thúc phiên tại `3ac3fe5`; các nhóm không thay đổi giữ kết quả và commit của lần chạy trước. [Báo cáo sửa tích hợp](../evidence/reviews/final-repair-report.md) ghi từng lệnh và log tương ứng. Kiểm tra shared/hash có stamp phạm vi riêng ở [final-verification/source.json](../evidence/final-verification/source.json); tài nguyên không thay đổi trong các sửa lỗi sau đó. Một số suite cũ tự in các kết luận rộng như “xuất xưởng” hoặc “100% secure”; báo cáo này chỉ dùng số assertion thực tế và không tiếp nhận những kết luận đó.

Ledger [2026-11-18-vnext-ledger.md](2026-11-18-vnext-ledger.md) giữ các quyết định, phạm vi từng nhiệm vụ, phát hiện và vòng sửa. Plan [2026-11-18-vnext-m1.md](../superpowers/plans/2026-11-18-vnext-m1.md) liên kết yêu cầu gốc. Bản build thành công, số lượng asset và ảnh tĩnh được tách khỏi bằng chứng chơi, animation và FPS.

[Lần rà soát sửa tích hợp](../evidence/reviews/final-repair-review.md) đóng bảy lỗi và giữ lại lỗi client tự tranh lại phiên; [lần rà soát hẹp cuối tại `3ac3fe5`](../evidence/reviews/terminal-handover-review.md) đóng lỗi còn lại, kết luận spec và chất lượng đều đạt trong phạm vi sửa, không có phát hiện Important/Critical mới. Cả tám lỗi Important của rà soát toàn nhánh đã được xử lý. Khuyến nghị tích hợp chỉ dành cho checkpoint phát triển; không thay thế nghiệm thu đầy đủ M1 hoặc bản phát hành.

[Rà soát bằng chứng bổ sung](../evidence/reviews/handoff-incremental-audit.md) đối chiếu đúng hash từng file trong archive, mã build, số đo, kết quả trình duyệt và các mã thoát đã lưu. Các kiểm tra private-data không in giá trị bí mật vào hồ sơ công khai. Log thô được giữ nguyên byte, kể cả dòng trống cuối; kiểm tra whitespace của mã/tài liệu không dùng việc sửa log để tạo kết quả xanh.

Đợt launcher ban đầu qua hai vòng sửa và rà soát độc lập, kết thúc tại `762c429`. Báo cáo [task-4-launcher-report.md](../evidence/reviews/task-4-launcher-report.md) ghi lệnh, RED/GREEN và các giới hạn; [task-4-launcher-fix-2-review.md](../evidence/reviews/task-4-launcher-fix-2-review.md) đóng phát hiện về mật khẩu chứa dấu nháy trong TXT và mọi file ZIP, kể cả log lịch sử. Đợt tích hợp tại `b5009d8` bổ sung nhận diện đúng dịch vụ game và che nhãn mật khẩu tiếng Việt; launcher core đạt 71/71. Kiểm tra supervisor, build launcher và build server đều thành công trong phạm vi ghi ở từng log. Native Windows vẫn chưa được nghiệm thu.

## 7. Cách nhận mã và chạy tiếp

Gói source chứa file được theo dõi trong Git, asset nguồn/bản xuất, tài liệu và bằng chứng; không chứa `node_modules`, `.env` làm việc, tài khoản thử riêng hoặc bản video thô dài. Git bundle giữ lịch sử nhánh `codex/vnext-m1` và tổ tiên của nó. Có thể mở một checkout riêng từ bundle:

```sh
git clone --branch codex/vnext-m1 vandaotruongsinh-vnext-m1.bundle vandaotruongsinh-vnext
```

Trên Windows, đường khởi động GUI nguồn được sửa là `CHAY_LAUNCHER.bat`; nếu chưa có executable, nó cài phụ thuộc launcher khi cần, build cả hai phần rồi mở Electron. Đây là hướng dẫn từ đường chạy trong mã, chưa phải xác nhận chạy thành công trên Windows. `npm run launcher:dev` làm cùng bước build/mở từ root sau khi đã có phụ thuộc desktop-launcher.

Cấu hình được chọn theo thứ tự: biến môi trường rõ ràng → file root `.env` → file `server/.env` khi không có root. Dùng một database phát triển riêng và thông tin của chính máy đó; không chép cấu hình của môi trường kiểm thử trong báo cáo. Auto-Setup không đồng bộ schema/seed cho đích remote, production hoặc thiếu nhãn development. Database TCP nghe được chưa đủ chứng minh đăng nhập và schema sẵn sàng. Các lệnh kiểm thử trình duyệt cùng điều kiện database `_test` nằm trong [scripts/verification/README.md](../../scripts/verification/README.md).

Ưu tiên vòng tiếp theo: đo WebGL phần cứng ở hai độ phân giải; hoàn tất kiểm tra bước chân/mốc chân/hồi sinh và sửa tên NPC bị mái che; thử focus thật cùng luồng GUI Windows; sau khi khu mẫu được nghiệm thu mới mở rộng mỹ thuật/vòng chơi cho hai hướng tu còn lại và M2–M3. Đường production compiled và launcher console vẫn cần công việc M4.
