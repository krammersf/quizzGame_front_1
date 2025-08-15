#!/bin/bash

# Script para criar imagens placeholder de Star Wars para o card_21

echo "🌟 Criando imagens de Star Wars para o card_21..."

cd /Users/fredericobajouco/Desktop/Fred/Fred_Programs/quizzGame_front_1/imagens

# Verificar se ImageMagick está disponível
if ! command -v convert >/dev/null 2>&1; then
    echo "⚠️ ImageMagick não está instalado. Tentando instalar via Homebrew..."
    if command -v brew >/dev/null 2>&1; then
        brew install imagemagick
    else
        echo "❌ Homebrew não encontrado. Por favor, instale ImageMagick manualmente."
        exit 1
    fi
fi

# Função para criar imagem placeholder
create_image() {
    local code=$1
    local description=$2
    local color=$3
    
    echo "🎨 Criando $code - $description..."
    
    # Criar imagem placeholder com texto
    convert -size 400x300 -background "$color" -gravity center -fill white -font Arial-Bold -pointsize 20 label:"$description" "${code}.png"
    
    if [ -f "${code}.png" ]; then
        echo "✅ $code: Imagem criada"
        return 0
    else
        echo "❌ $code: Falha na criação"
        return 1
    fi
}

# Criar imagens para as 50 perguntas Star Wars
success=0
total=50

echo "Criando placeholders de Star Wars..."

create_image "W000001" "Darth Vader" "#000000" && ((success++))
create_image "W000002" "Tatooine" "#F4A460" && ((success++))
create_image "W000003" "Millennium Falcon" "#C0C0C0" && ((success++))
create_image "W000004" "Qui-Gon Jinn" "#4169E1" && ((success++))
create_image "W000005" "Emperor Sidious" "#800080" && ((success++))
create_image "W000006" "Anakin Skywalker" "#87CEEB" && ((success++))
create_image "W000007" "Mace Windu" "#800080" && ((success++))
create_image "W000008" "Yoda" "#228B22" && ((success++))
create_image "W000009" "C-3PO" "#FFD700" && ((success++))
create_image "W000010" "Yavin 4" "#8B4513" && ((success++))
create_image "W000011" "Jabba the Hutt" "#8B4513" && ((success++))
create_image "W000012" "Dagobah" "#228B22" && ((success++))
create_image "W000013" "Jedi Order" "#4169E1" && ((success++))
create_image "W000014" "Princess Leia" "#FFFFFF" && ((success++))
create_image "W000015" "Endor" "#228B22" && ((success++))
create_image "W000016" "Commander Cody" "#FFFFFF" && ((success++))
create_image "W000017" "Darth Plagueis" "#8B0000" && ((success++))
create_image "W000018" "Coruscant" "#696969" && ((success++))
create_image "W000019" "Kashyyyk" "#8B4513" && ((success++))
create_image "W000020" "C-3PO Origin" "#FFD700" && ((success++))
create_image "W000021" "Death Star" "#696969" && ((success++))
create_image "W000022" "Empire Strikes Back" "#000000" && ((success++))
create_image "W000023" "Podrace" "#F4A460" && ((success++))
create_image "W000024" "Queen Amidala" "#8B0000" && ((success++))
create_image "W000025" "Darth Maul" "#8B0000" && ((success++))
create_image "W000026" "Twin Suns" "#FFD700" && ((success++))
create_image "W000027" "Cantina" "#8B4513" && ((success++))
create_image "W000028" "Vader vs Luke" "#FF0000" && ((success++))
create_image "W000029" "Hoth" "#FFFFFF" && ((success++))
create_image "W000030" "General Grievous" "#C0C0C0" && ((success++))
create_image "W000031" "Kamino" "#4169E1" && ((success++))
create_image "W000032" "R2-D2" "#4169E1" && ((success++))
create_image "W000033" "Chewbacca" "#8B4513" && ((success++))
create_image "W000034" "Ben Solo" "#000000" && ((success++))
create_image "W000035" "Anakin Jedi" "#4169E1" && ((success++))
create_image "W000036" "Obi-Wan" "#4169E1" && ((success++))
create_image "W000037" "Sarlacc Pit" "#F4A460" && ((success++))
create_image "W000038" "Luke Jedi" "#228B22" && ((success++))
create_image "W000039" "TIE Pilot" "#000000" && ((success++))
create_image "W000040" "Senator Padme" "#800080" && ((success++))
create_image "W000041" "Jawa" "#8B4513" && ((success++))
create_image "W000042" "Boba Fett" "#228B22" && ((success++))
create_image "W000043" "Rebel Alliance" "#FF0000" && ((success++))
create_image "W000044" "Old Republic" "#FFD700" && ((success++))
create_image "W000045" "X-wing" "#FF0000" && ((success++))
create_image "W000046" "Stormtrooper" "#FFFFFF" && ((success++))
create_image "W000047" "Dewback" "#F4A460" && ((success++))
create_image "W000048" "Loyal Wookiee" "#8B4513" && ((success++))
create_image "W000049" "Hero Luke" "#4169E1" && ((success++))
create_image "W000050" "Jedi Wisdom" "#228B22" && ((success++))

echo ""
echo "📊 Resultado da criação: $success/$total imagens criadas"

# Verificar total de arquivos PNG com W000
total_png=$(ls W000*.png 2>/dev/null | wc -l)
echo "📁 Total de arquivos PNG Star Wars: $total_png"

if [ "$total_png" -eq 50 ]; then
    echo "🎉 Todas as 50 imagens de Star Wars foram criadas em formato PNG!"
else
    echo "⚠️ Ainda faltam algumas imagens. Total esperado: 50"
fi

echo "✅ Criação de imagens Star Wars concluída!"
