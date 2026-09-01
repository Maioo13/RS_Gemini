sed -i '/type="submit"/i \
            <div class="mb-4 flex items-start gap-2">\
              <input type="checkbox" id="privacyConsent" name="privacyConsent" required class="mt-1 h-4 w-4 rounded border-gray-300 text-[#e63f11] focus:ring-[#e63f11]">\
              <label for="privacyConsent" class="text-sm text-[#1c110d]">\
                Ho letto l'"'"'<a href="privacy.html" target="_blank" class="text-[#e63f11] underline">Informativa sulla Privacy</a> e acconsento al trattamento dei miei dati per la gestione di questa richiesta.\
              </label>\
            </div>' contatti.html
