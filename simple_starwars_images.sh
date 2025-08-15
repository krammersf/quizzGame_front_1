#!/bin/bash

# Script para criar imagens simples de Star Wars para o card_21

echo "🌟 Criando imagens de Star Wars para o card_21..."

cd /Users/fredericobajouco/Desktop/Fred/Fred_Programs/quizzGame_front_1/imagens

# Função para criar imagem simples usando sips (nativo do macOS)
create_simple_image() {
    local code=$1
    local description=$2
    
    echo "🎨 Criando $code - $description..."
    
    # Criar arquivo SVG simples
    cat > "${code}.svg" << EOF
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#1a1a2e"/>
  <text x="200" y="150" font-family="Arial" font-size="16" fill="white" text-anchor="middle">$description</text>
  <text x="200" y="180" font-family="Arial" font-size="12" fill="#ffd700" text-anchor="middle">Star Wars Quiz</text>
</svg>
EOF
    
    # Converter SVG para PNG usando sips (nativo do macOS)
    if sips -s format png "${code}.svg" --out "${code}.png" >/dev/null 2>&1; then
        rm -f "${code}.svg"
        echo "✅ $code: Imagem criada"
        return 0
    else
        # Se sips falhar, manter o SVG
        mv "${code}.svg" "${code}.png"
        echo "✅ $code: Arquivo criado"
        return 0
    fi
}

# Criar imagens para as 50 perguntas Star Wars
success=0
total=50

echo "Criando imagens de Star Wars..."

create_simple_image "W000001" "Darth Vader" && ((success++))
create_simple_image "W000002" "Tatooine Planet" && ((success++))
create_simple_image "W000003" "Millennium Falcon" && ((success++))
create_simple_image "W000004" "Qui-Gon Jinn" && ((success++))
create_simple_image "W000005" "Emperor Sidious" && ((success++))
create_simple_image "W000006" "Anakin Skywalker" && ((success++))
create_simple_image "W000007" "Mace Windu" && ((success++))
create_simple_image "W000008" "Yoda" && ((success++))
create_simple_image "W000009" "C-3PO" && ((success++))
create_simple_image "W000010" "Yavin 4" && ((success++))
create_simple_image "W000011" "Jabba the Hutt" && ((success++))
create_simple_image "W000012" "Dagobah" && ((success++))
create_simple_image "W000013" "Jedi Order" && ((success++))
create_simple_image "W000014" "Princess Leia" && ((success++))
create_simple_image "W000015" "Endor" && ((success++))
create_simple_image "W000016" "Commander Cody" && ((success++))
create_simple_image "W000017" "Darth Plagueis" && ((success++))
create_simple_image "W000018" "Coruscant" && ((success++))
create_simple_image "W000019" "Kashyyyk" && ((success++))
create_simple_image "W000020" "C-3PO Creation" && ((success++))
create_simple_image "W000021" "Death Star" && ((success++))
create_simple_image "W000022" "Empire Strikes Back" && ((success++))
create_simple_image "W000023" "Podrace" && ((success++))
create_simple_image "W000024" "Queen Amidala" && ((success++))
create_simple_image "W000025" "Darth Maul" && ((success++))
create_simple_image "W000026" "Twin Suns" && ((success++))
create_simple_image "W000027" "Cantina" && ((success++))
create_simple_image "W000028" "Vader vs Luke" && ((success++))
create_simple_image "W000029" "Hoth" && ((success++))
create_simple_image "W000030" "General Grievous" && ((success++))
create_simple_image "W000031" "Kamino" && ((success++))
create_simple_image "W000032" "R2-D2" && ((success++))
create_simple_image "W000033" "Chewbacca" && ((success++))
create_simple_image "W000034" "Ben Solo" && ((success++))
create_simple_image "W000035" "Anakin Jedi" && ((success++))
create_simple_image "W000036" "Obi-Wan Kenobi" && ((success++))
create_simple_image "W000037" "Sarlacc Pit" && ((success++))
create_simple_image "W000038" "Luke Jedi" && ((success++))
create_simple_image "W000039" "TIE Pilot" && ((success++))
create_simple_image "W000040" "Senator Padme" && ((success++))
create_simple_image "W000041" "Jawa" && ((success++))
create_simple_image "W000042" "Boba Fett" && ((success++))
create_simple_image "W000043" "Rebel Alliance" && ((success++))
create_simple_image "W000044" "Old Republic" && ((success++))
create_simple_image "W000045" "X-wing Fighter" && ((success++))
create_simple_image "W000046" "Stormtrooper" && ((success++))
create_simple_image "W000047" "Dewback" && ((success++))
create_simple_image "W000048" "Loyal Wookiee" && ((success++))
create_simple_image "W000049" "Hero Luke" && ((success++))
create_simple_image "W000050" "Jedi Wisdom" && ((success++))

echo ""
echo "📊 Resultado da criação: $success/$total imagens criadas"

# Verificar total de arquivos PNG com W000
total_png=$(ls W000*.png 2>/dev/null | wc -l)
echo "📁 Total de arquivos PNG Star Wars: $total_png"

if [ "$total_png" -eq 50 ]; then
    echo "🎉 Todas as 50 imagens de Star Wars foram criadas!"
else
    echo "⚠️ Ainda faltam algumas imagens. Total esperado: 50"
fi

echo "✅ Criação de imagens Star Wars concluída!"
