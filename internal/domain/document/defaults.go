package document

import (
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/shared"
)

func Defaults(hotelID uuid.UUID) []Template {
	rental := `{{hotel_name}}

Daire No: {{room_code}}
Kiraya Veren: [İşletmenin ticari unvanı]
Belge No: [Turizm belgesi numarası]

Müşteri İsim Soyisim: {{guest_name}}
TC Kimlik Numarası: {{id_numbers}}
Telefon Numarası: {{phones}}
Misafir İsim Soyisim: {{guest_names}}
Yakınlık Durumu: {{relationships}}

Giriş Tarihi: {{check_in}}
Çıkış Tarihi: {{check_out}}
Kiraya Veren:
İmza:

Kiralanan Konutta Demirbaş Eşyalar:
{{inventory}}

Genel Koşullar:
1. Konaklanan daireyi kendi malı gibi kullanıp eşya ve mevcudatının zarar görmemesini sağlamakla yükümlüdür.
2. Odaya giriş saati 14:00, çıkış saati 11:00. Erken giriş veya geç çıkış için resepsiyona bilgi veriniz. Geç çıkış ek ücrete tabidir.
3. İzinsiz ya da kimliksiz ziyaretçi kabul edilmez. Konaklayan bütün misafirler KBS sistemine iletilir.
4. Oda anahtarı müşteri sorumluluğundadır. Kaybolması veya iade edilmemesi durumunda ücret tahsil edilir.
5. Ev misafirleri ve müşterilerimiz ortamımızda ticari ücretli veya amacı tanımlanmamış hizmet dışında bir ilişki bulunamaz.

Misafir Beyanı:
Bu formu imzalayarak verdiğim bilgilerin doğru olduğunu, yukarıdaki konaklama koşullarını okuduğumu ve kabul ettiğimi beyan ederim.

Misafir İmza:
`
	receiptTR := `{{hotel_name}} / {{branch_name}}
Rezervasyon: {{booking_id}}
Oda / Daire: {{room_code}}
Müşteri: {{guest_name}}
Misafirler: {{guest_names}}
Giriş: {{check_in}}
Çıkış: {{check_out}}
`
	receiptEN := `{{hotel_name}} / {{branch_name}}
Reservation: {{booking_id}}
Room / Apartment: {{room_code}}
Customer: {{guest_name}}
Guests: {{guest_names}}
Arrival: {{check_in}}
Departure: {{check_out}}
`
	return []Template{
		{HotelID: hotelID, Kind: "rental_contract", Title: shared.LocalizedString{constants.LanguageTR: "Turizm Amaçlı Kiralanan Konut Sözleşmesi"}, Body: shared.LocalizedString{constants.LanguageTR: rental}},
		{HotelID: hotelID, Kind: "sale_contract", Title: shared.LocalizedString{constants.LanguageTR: "Konaklama Satış Sözleşmesi", constants.LanguageEN: "Accommodation Sales Agreement"}, Body: shared.LocalizedString{constants.LanguageTR: receiptTR + "\nSözleşme bedeli: {{amount}} {{currency}}\nHizmet kapsamı ve koşulları: [İşletme tarafından düzenlenecek]\n\nİşletme imzası:\nMüşteri imzası:\n", constants.LanguageEN: receiptEN + "\nContract amount: {{amount}} {{currency}}\nServices and terms: [To be completed by the property]\n\nProperty signature:\nCustomer signature:\n"}},
		{HotelID: hotelID, Kind: "reservation_receipt", Title: shared.LocalizedString{constants.LanguageTR: "Rezervasyon Dekontu", constants.LanguageEN: "Reservation Confirmation"}, Body: shared.LocalizedString{constants.LanguageTR: receiptTR, constants.LanguageEN: receiptEN}},
		{HotelID: hotelID, Kind: "sale_receipt", Title: shared.LocalizedString{constants.LanguageTR: "Satış / Tahsilat Dekontu", constants.LanguageEN: "Payment Receipt"}, Body: shared.LocalizedString{constants.LanguageTR: receiptTR + "\nTahsil edilen tutar: {{amount}} {{currency}}\nÖdeme yöntemi: {{payment_method}}\nÖdeme tarihi: {{paid_at}}\nReferans: {{payment_reference}}\n", constants.LanguageEN: receiptEN + "\nAmount received: {{amount}} {{currency}}\nPayment method: {{payment_method}}\nPayment date: {{paid_at}}\nReference: {{payment_reference}}\n"}},
		{HotelID: hotelID, Kind: "cancellation_receipt", Title: shared.LocalizedString{constants.LanguageTR: "Rezervasyon İptal Belgesi", constants.LanguageEN: "Reservation Cancellation"}, Body: shared.LocalizedString{constants.LanguageTR: receiptTR + "\nRezervasyon iptal edilmiştir.\n", constants.LanguageEN: receiptEN + "\nThis reservation has been cancelled.\n"}},
	}
}
